# HolisticDrive Web App — v1.5 (Engine Connectivity Prototype, Dual Mode)

A small local web app that proves the HolisticDrive engine works from a browser. The same `index.html` runs in **two modes**:

| Mode | Auth | Who it's for | What you need |
|---|---|---|---|
| **Server mode** (recommended) | Your Claude Code subscription | You, on your own machine | Node ≥ 20, Claude Code signed in |
| **Direct mode** | An Anthropic API key (pay-per-token) | You without Node, or other users you give the zip to | Just a browser + an API key from console.anthropic.com |

The webapp auto-detects which mode is available by probing `/api/health` on page load. If the local server responds, it uses server mode; otherwise it falls back to direct mode and shows the API-key UI.

---

## How to use it

### Server mode (recommended for you)

This uses your existing Claude Code Pro/Max subscription. No API key, no per-token billing — usage counts against your interactive quota until June 15, 2026, after which it draws from a separate Agent SDK credit.

**One-time setup (~30 seconds):**

```bash
cd webapp
npm install
```

**Every time you want to use it:**

```bash
./start.sh
```

That's it. The script will:
1. Check Node is installed (and ≥ 20)
2. Start the server on `http://127.0.0.1:8847`
3. Wait for the server to be ready
4. Open the URL in your default browser

Press `Ctrl+C` in the terminal to stop the server.

If port 8847 is busy on your machine, override it:

```bash
PORT=9000 ./start.sh
```

### Direct mode (for sharing with others)

This is what you get when you just open `index.html` directly in a browser — no server, no Node. Each user pastes their own Anthropic API key from [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys); their browser calls the Anthropic API directly.

**Setup:** none. Just double-click `index.html` or open it via `file://`.

**If you see CORS errors with `file://` origin**, serve via a tiny local server:

```bash
cd webapp
python3 -m http.server 8765   # macOS / Linux
# Then visit http://localhost:8765
```

On Windows:
```cmd
cd webapp
py -3 -m http.server 8765
```

---

## What this is — and isn't

**It is:**
- A single-page chat UI for the HolisticDrive intake conversation
- Two backend modes from one HTML file (auto-detected)
- Server mode uses the official Claude Agent SDK with subscription auth
- Direct mode is a pure static webapp calling Anthropic from the browser
- All data stays on the user's machine (no telemetry, no analytics)

**It isn't (yet):**
- The full HolisticDrive pipeline (intake → safety gate → triage → 20 domain specialists → cross-reference → safety review → protocol generator)
- Doesn't persist conversations or build a structured profile (`merryl.json`-style)
- Doesn't upload or OCR lab reports
- Doesn't render the editorial protocol HTML briefs
- Doesn't load Claude Code's actual `agents/*.md` files yet — uses one inline system prompt that captures the intake spirit

All of that is the v2 / v3 roadmap below.

---

## File layout

```
webapp/
├── index.html         Single-page UI (HTML + CSS + JS, ~25 KB)
├── server.ts          Node HTTP server + Agent SDK glue (~10 KB)
├── start.sh           Launcher: install deps, start server, open browser
├── package.json       npm metadata + scripts
├── tsconfig.json      Strict TypeScript config
├── .env.example       Optional config (PORT, HOST, ANTHROPIC_API_KEY override)
├── .gitignore         Excludes node_modules/, .env, dist/, *.log
├── README.md          This file
└── node_modules/      Installed dependencies (after `npm install`)
```

Two files do the work: `server.ts` (~10 KB) and `index.html` (~25 KB). Everything else is configuration and packaging.

---

## Privacy & data flow

| What | Where it lives |
|---|---|
| Your API key (direct mode) | Browser only — localStorage if "Remember", sessionStorage otherwise |
| Your chat messages | In memory in your browser only — wiped on page reload |
| Server-mode session IDs | Returned by the SDK; your browser stores them in JS state only |
| Your conversations with Claude | Sent to Anthropic's API (their data retention policy applies). Read it here: [anthropic.com/legal/privacy](https://www.anthropic.com/legal/privacy) |
| The local server log | Temp file like `/tmp/hd-server-XXXXXX.log` — clear when you reboot |
| Anything else | Nothing leaves your machine |

There is no analytics service, no error reporting backend, no telemetry. The only outbound network calls are: (1) to `api.anthropic.com` (for both modes), (2) to Google Fonts CDN (for the typography — load is cached). The Content Security Policy in the HTML head enforces that no other origins can be contacted.

**Security caveats:**
- **Server mode** binds to `127.0.0.1` only by default — meaning only programs running on your machine can reach it. Do not change the `HOST` env var to `0.0.0.0` unless you understand the implications (your server becomes reachable from anything on your local network).
- **Direct mode** stores the API key in browser storage. Anyone with access to your browser profile (or a successful XSS attack — bounded by the strict CSP) could read it. For maximum safety, uncheck "Remember key" and paste it fresh each session.

---

## Models

In **server mode**, the SDK uses whatever model your Claude Code installation is configured to use. The model dropdown in Settings is hidden because it would be ignored.

In **direct mode**, the dropdown picks the model used for the direct API call:

| ID | Best for | Cost |
|---|---|---|
| `claude-sonnet-4-6` (default) | Conversational chat, balanced quality & cost | $$ |
| `claude-opus-4-7` | Most capable model when you need depth | $$$ |
| `claude-haiku-4-5-20251001` | Fastest, cheapest — good for quick interactions | $ |

---

## Configuration (server mode)

Copy `.env.example` to `.env` and edit:

```bash
cp .env.example .env
```

Available variables:

- `PORT` — server port, default `8847`
- `HOST` — bind host, default `127.0.0.1` (loopback only)
- `ANTHROPIC_API_KEY` — if set, the SDK uses this API key instead of your subscription auth. Useful as a fallback if subscription auth has issues.

When the server starts, it prints which auth mode it's using:

```
---
  HolisticDrive webapp v0.1.0
  Auth mode: subscription
  Listening:  http://127.0.0.1:8847
  Press Ctrl+C to stop.
---
```

`Auth mode: subscription` means it's using your Claude Code credentials. `Auth mode: api-key` means it picked up `ANTHROPIC_API_KEY` from the environment.

---

## Known limitations (v1.5)

- **No conversation persistence across page reloads** — server-mode session IDs live in browser state only. (v2 adds IndexedDB.)
- **No file upload / OCR.** You can describe lab values in text and the assistant will read them. (v2 adds upload; v3 considers OCR.)
- **No structured profile output.** The assistant won't produce a `merryl.json`-style file or render editorial HTML briefs — that requires the full pipeline. (v2.)
- **Single agent only.** The full HolisticDrive pipeline has nine domain specialists running in parallel + safety gates + protocol generation. v1.5 uses one tight intake-style system prompt.
- **No streaming.** Responses appear all at once when complete. (v3 adds SSE streaming.)
- **No `tool_use` integration.** Claude can't yet call browser-side functions like "save to profile" or "render protocol". (v2.)
- **No `agents/*.md` reuse.** The system prompt is currently inline in `server.ts`. (v2 loads from `../agents/`.)

---

## Roadmap

**v2 — Persistence + full pipeline**
- IndexedDB for profile, findings, protocols, conversation history
- Load `../agents/*.md` and `../skills/*.md` into the server at startup
- Pipeline orchestrator: phase 1 → phase 2 (parallel domain specialists) → phase 2.5 (medical-researcher) → phase 3 (sequential synthesis)
- `tool_use` so SDK-driven agents call browser handlers for profile / findings / protocol persistence
- Render the editorial HTML briefs in-app, matching the aesthetic of `../profiles/*.html`

**v3 — Polish + distribution**
- File upload (PDF / images) for lab reports
- OCR option (Tesseract.js WASM, ~10 MB add) or Anthropic vision (paid)
- Export / import full data bundle (JSON + HTML)
- PWA install (Add to Home Screen / Install as App)
- SSE streaming responses
- Multi-profile per install (family use case)
- Optional WebCrypto encryption of API key with passphrase
- Distributable zip with a Mac/Windows launcher GUI

---

## Sharing with others

Server mode is for you alone (per Anthropic's terms, third parties can't proxy claude.ai login through Agent SDK products). For non-technical others, the path is direct mode:

```bash
cd webapp
zip -r holisticdrive-webapp.zip index.html README.md
```

Share the zip. Recipients unzip and open `index.html`. They'll need their own Anthropic API key from console.anthropic.com.

For technical users with their own Claude Code subscription, share the whole `webapp/` directory (minus `node_modules/`). They run `npm install` then `./start.sh` — same experience you have.

---

## Troubleshooting

**Server fails to start with `EADDRINUSE`.** Port 8847 is already in use. Pick another:
```bash
PORT=8848 ./start.sh
```

**Health probe fails on browser load (badge still says "Detecting server…").** The detect probe to `/api/health` failed. Open browser DevTools → Network and check the request. Most common cause: you opened `index.html` via `file://` instead of via the local server URL. With `file://`, server mode is impossible — you'll fall back to direct mode automatically after a brief delay.

**Chat call returns "Agent SDK call failed: …".** Server-side error. Check the server log file mentioned in the terminal output. Most common causes:
- Claude Code is not signed in. Run `claude` in another terminal and authenticate.
- Network problem reaching `api.anthropic.com`.
- Rate limit hit (subscription's interactive quota exceeded).

**Chat returns CORS error in direct mode.** Your browser blocked the `file://` origin from calling `api.anthropic.com`. Serve via a local HTTP server (see "Direct mode" section above).

**Server installed but `start.sh: permission denied`.** Make it executable:
```bash
chmod +x start.sh
```

---

## Acknowledgments

Built with the [Claude Agent SDK](https://docs.claude.com/en/agent-sdk/overview) (TypeScript). Uses the open-source fonts [Fraunces](https://fonts.google.com/specimen/Fraunces), [Spline Sans](https://fonts.google.com/specimen/Spline+Sans), and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) via Google Fonts CDN.

The HolisticDrive engine (agents, skills, pipeline architecture, all the profile/findings/protocol work) is the work captured in the parent repository — `../agents/`, `../skills/`, `../knowledge-base/`, `../profiles/`, `../findings/`. This webapp is a thin frontend on top of that work.
