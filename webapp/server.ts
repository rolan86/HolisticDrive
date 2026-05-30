/**
 * HolisticDrive local web server
 *
 * Serves the static chat UI (index.html) and exposes a tiny chat API that
 * routes through the Claude Agent SDK. The SDK uses the locally installed
 * Claude Code credentials (your Pro/Max subscription), so no API key is
 * required for you on your own machine. An ANTHROPIC_API_KEY env var, if
 * set, takes precedence — useful as a fallback.
 *
 * Endpoints:
 *   GET  /              → serve index.html
 *   GET  /api/health    → { ok, version, authMode }
 *   POST /api/chat      → { sessionId, message } -> { sessionId, reply }
 *
 * Run with: `npm start` (uses tsx to execute TS directly).
 * Type-check with: `npm run typecheck`.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { join, dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { query, type Options } from '@anthropic-ai/claude-agent-sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Isolated working directory the SDK uses as its cwd. Keeping this far from
// the developer's project tree prevents the Claude Code agent from walking up
// to find CLAUDE.md / .claude/ / project-keyed auto-memory at
// ~/.claude/projects/<encoded-cwd>/memory/. Created at boot.
const SDK_CWD = join(tmpdir(), 'holisticdrive-sdk-isolated');

// HolisticDrive project root — the parent of webapp/. Granted to the SDK via
// additionalDirectories so the assistant can Read/Glob/Grep profiles/,
// findings/, knowledge-base/, etc. when the user asks about their records.
// Read-only: no Write/Edit/Bash in allowedTools.
const HD_ROOT = resolvePath(join(__dirname, '..'));

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Port 8847 chosen to avoid conflicts with common dev defaults (3000/5000/
// 8000/8080/8765 etc.). Override with the PORT env var if it collides on
// your machine. HOST defaults to loopback only — see .env.example before
// changing this to anything publicly accessible.
const PORT = Number(process.env.PORT ?? 8847);
const HOST = process.env.HOST ?? '127.0.0.1';
const HAS_API_KEY = Boolean(process.env.ANTHROPIC_API_KEY);
const AUTH_MODE = HAS_API_KEY ? 'api-key' : 'subscription';
const VERSION = '0.2.0';

const SYSTEM_PROMPT = `You are HolisticDrive — a research-informed holistic health intake specialist. You are NOT a doctor and never diagnose, treat, or cure conditions.

Your role in this conversation: gather the user's health context conversationally — lab values, current symptoms, diet patterns, sleep, activity, family history, current medications, supplements, lifestyle factors. Reflect back what you hear in a way that shows you understood. Ask follow-ups that surface what actually matters for their situation, not surveys.

Language standards (always):
- Use advisory framing: "may suggest", "is associated with", "consider discussing with your practitioner"
- Flag potential concerns with explicit confidence levels (low / moderate / high)
- Never recommend stopping prescribed medications
- Never claim to diagnose, treat, or cure any condition

Iterative principles:
- Start low, go slow — first responses introduce 2–3 changes, not 20
- Observe before adding — acknowledge that changes need time to work
- Address root causes when you can, but acknowledge symptom relief matters too
- Not everything needs fixing at once — prioritize by impact and safety

Format guidance:
- Conversational, not clinical. Match the user's energy.
- Markdown is rendered (headings, bold, italic, lists, code, links).
- Use short paragraphs and structured lists when the content benefits.
- One or two thoughtful questions per turn beats a checklist of ten.

Scope of this v0.2 prototype:
- You have READ-ONLY filesystem access to the HolisticDrive project directory (the parent of this webapp/) via the Read, Glob, and Grep tools. You cannot Write, Edit, or run Bash.
- When the user asks about their own records, prior labs, or earlier research, look first instead of asking them to paste it. Mention which file(s) you read so they can verify.
- Places worth checking (use Glob to confirm what's actually there before claiming a file exists):
  - profiles/*.json — structured health profile (lab values, demographics, ancestry, conditions, medications)
  - profiles/*.html — editorial briefs from prior research sessions (e.g. Lp(a) management plans)
  - findings/*.json — per-session domain-specialist and medical-researcher findings
  - knowledge-base/ — versioned research notes and reference material
  - agents/, skills/ — the engine's own pipeline definitions (read if a user asks how the system works)
- If profiles/ or findings/ are empty, treat the conversation as a fresh intake and gather context conversationally.
- You CANNOT yet: persist new data, run the full pipeline (safety gate → triage → domain specialists → cross-reference → safety review → protocol generator), or accept document uploads. Tell the user clearly when their request needs those — they ship in v2.

Be warm, direct, and respectful of the user's autonomy. They are the expert on their own life.`;

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function sendJson(res: ServerResponse, status: number, body: JsonValue): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload).toString(),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function send404(res: ServerResponse): void {
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

function sendMethodNotAllowed(res: ServerResponse, allow: string): void {
  res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8', allow });
  res.end(`Method not allowed. Use ${allow}.`);
}

async function readJsonBody(req: IncomingMessage, maxBytes = 1_000_000): Promise<unknown> {
  return await new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error(`Request body too large (>${maxBytes} bytes).`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolveBody({});
        return;
      }
      try {
        resolveBody(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON in request body.'));
      }
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Static file serving (just index.html for v1.5)
// ---------------------------------------------------------------------------

const STATIC_FILES: Record<string, string> = {
  '/': 'index.html',
  '/index.html': 'index.html',
};

const MIME_BY_EXT: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

async function serveStatic(pathname: string, res: ServerResponse): Promise<boolean> {
  const filename = STATIC_FILES[pathname];
  if (!filename) return false;

  const filepath = resolvePath(join(__dirname, filename));
  // Defense against path traversal — confirm resolved path is still inside __dirname.
  if (!filepath.startsWith(__dirname)) {
    send404(res);
    return true;
  }

  try {
    await stat(filepath);
  } catch {
    send404(res);
    return true;
  }

  const ext = filename.slice(filename.lastIndexOf('.'));
  const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
  const body = await readFile(filepath);
  res.writeHead(200, {
    'content-type': contentType,
    'content-length': body.length.toString(),
    'cache-control': 'no-store',
  });
  res.end(body);
  return true;
}

// ---------------------------------------------------------------------------
// Chat endpoint: routes through Claude Agent SDK
// ---------------------------------------------------------------------------

interface ChatRequest {
  sessionId?: string | null;
  message: string;
}

interface ChatResponse {
  sessionId: string;
  reply: string;
}

function parseChatRequest(body: unknown): ChatRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Body must be a JSON object.');
  }
  const obj = body as Record<string, unknown>;
  const message = obj.message;
  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('Field "message" is required and must be a non-empty string.');
  }
  const sessionId = obj.sessionId;
  if (sessionId !== null && sessionId !== undefined && typeof sessionId !== 'string') {
    throw new Error('Field "sessionId" must be a string, null, or omitted.');
  }
  return {
    message,
    sessionId: typeof sessionId === 'string' ? sessionId : null,
  };
}

async function handleChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, { error: (err as Error).message });
    return;
  }

  let parsed: ChatRequest;
  try {
    parsed = parseChatRequest(body);
  } catch (err) {
    sendJson(res, 400, { error: (err as Error).message });
    return;
  }

  // Build Agent SDK options.
  // - allowedTools: read-only filesystem access only (Read/Glob/Grep). No
  //   Write/Edit/Bash. The assistant can introspect the user's HolisticDrive
  //   records but cannot mutate the disk or run commands.
  // - settingSources: [] tells the SDK NOT to load ~/.claude/ or project
  //   CLAUDE.md / skills / commands. Avoids inheriting developer context.
  // - cwd: SDK_CWD is a neutral temp directory so the agent can't locate
  //   project-keyed auto-memory at ~/.claude/projects/<cwd-hash>/memory/.
  // - additionalDirectories: HD_ROOT grants the assistant read scope to the
  //   HolisticDrive project (profiles/, findings/, knowledge-base/, etc.).
  //   Combined with the read-only tool list, this is a deliberate, scoped
  //   grant — not the broad inheritance settingSources would bring back.
  // - resume threads multi-turn context by reusing the prior session ID.
  const options: Options = {
    systemPrompt: SYSTEM_PROMPT,
    allowedTools: ['Read', 'Glob', 'Grep'],
    settingSources: [],
    cwd: SDK_CWD,
    additionalDirectories: [HD_ROOT],
    ...(parsed.sessionId ? { resume: parsed.sessionId } : {}),
  };

  let sessionId: string | null = parsed.sessionId ?? null;
  let reply = '';
  let errorMessage: string | null = null;

  try {
    for await (const message of query({ prompt: parsed.message, options })) {
      // Each message has a discriminated `type`. We care about two:
      //   - { type: "system", subtype: "init", session_id }
      //   - { type: "result", result, ...other fields }
      const m = message as { type?: string; subtype?: string; session_id?: string; result?: unknown };
      if (m.type === 'system' && m.subtype === 'init' && typeof m.session_id === 'string') {
        sessionId = m.session_id;
        continue;
      }
      if (m.type === 'result' && typeof m.result === 'string') {
        reply = m.result;
        continue;
      }
    }
  } catch (err) {
    errorMessage = (err as Error).message || 'Unknown SDK error.';
  }

  if (errorMessage) {
    sendJson(res, 500, {
      error: 'Agent SDK call failed: ' + errorMessage,
      hint: HAS_API_KEY
        ? 'Confirm the ANTHROPIC_API_KEY is valid and that your account has credits.'
        : 'Confirm Claude Code is signed in (`claude` in another terminal) with an active Pro/Max subscription.',
    });
    return;
  }

  if (!sessionId) {
    sendJson(res, 500, {
      error: 'Agent SDK did not return a session ID. The call likely failed before initialization.',
    });
    return;
  }

  if (!reply) {
    sendJson(res, 500, {
      error: 'Agent SDK returned an empty reply. The model may have produced no output for this prompt.',
    });
    return;
  }

  const response: ChatResponse = { sessionId, reply };
  sendJson(res, 200, response as unknown as JsonValue);
}

// ---------------------------------------------------------------------------
// Health endpoint — used by the browser to detect server-mode availability
// ---------------------------------------------------------------------------

function handleHealth(res: ServerResponse): void {
  sendJson(res, 200, {
    ok: true,
    service: 'holisticdrive-webapp',
    version: VERSION,
    authMode: AUTH_MODE,
    sdkVersion: '0.3.156',
    readableRoot: HD_ROOT,
    tools: ['Read', 'Glob', 'Grep'],
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

async function router(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!req.url) {
    send404(res);
    return;
  }
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname;
  const method = req.method ?? 'GET';

  // CORS: allow only same-origin. Since the browser served the page from
  // this same server, no cross-origin requests need to be allowed.
  // (If we ever serve the UI from elsewhere, revisit.)

  if (pathname === '/api/health') {
    if (method !== 'GET') {
      sendMethodNotAllowed(res, 'GET');
      return;
    }
    handleHealth(res);
    return;
  }

  if (pathname === '/api/chat') {
    if (method !== 'POST') {
      sendMethodNotAllowed(res, 'POST');
      return;
    }
    await handleChat(req, res);
    return;
  }

  if (method === 'GET') {
    const served = await serveStatic(pathname, res);
    if (served) return;
  }

  send404(res);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

const server = createServer((req, res) => {
  router(req, res).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[server] unhandled error:', message);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Internal server error: ' + message });
    }
  });
});

async function ensureSdkCwd(): Promise<void> {
  await mkdir(SDK_CWD, { recursive: true });
}

ensureSdkCwd()
  .then(() => {
    server.listen(PORT, HOST, () => {
      const url = `http://${HOST}:${PORT}`;
      console.log('---');
      console.log(`  HolisticDrive webapp v${VERSION}`);
      console.log(`  Auth mode:   ${AUTH_MODE}`);
      console.log(`  SDK cwd:     ${SDK_CWD}`);
      console.log(`  Read scope:  ${HD_ROOT}`);
      console.log(`  Tools:       Read, Glob, Grep (read-only)`);
      console.log(`  Listening:   ${url}`);
      console.log(`  Press Ctrl+C to stop.`);
      console.log('---');
    });
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[server] failed to prepare SDK cwd:', message);
    process.exit(1);
  });

function shutdown(reason: string): void {
  console.log(`\n[server] ${reason} — shutting down.`);
  server.close(() => {
    console.log('[server] stopped.');
    process.exit(0);
  });
  // Force-exit if close() hangs (e.g. on lingering keep-alive sockets).
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT received'));
process.on('SIGTERM', () => shutdown('SIGTERM received'));
