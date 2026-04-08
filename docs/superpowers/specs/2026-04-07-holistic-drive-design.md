# HolisticDrive — Agentic Holistic Health Research Framework

## Overview

HolisticDrive is a Claude Code plugin that provides personalized holistic health research and recommendations. It is an iterative health system — not a one-shot analysis tool — that acts as a research specialist, guide, and holistic practitioner. It does not replace medical care; it provides evidence-informed holistic recommendations while flagging anything that warrants professional attention.

**Primary user:** Individuals seeking holistic health guidance (self-service).
**Execution environment:** Claude Code native — built as a plugin with agents, skills, and MCP servers. No web app, no database, no deployment.
**Core modalities:** Nutrition, herbal medicine, exercise/movement, Ayurveda, sleep optimization, and stress/mind practices.

## Privacy & Data Handling

All health data is stored locally. The system handles sensitive personal health information (medical history, lab results, medications, family history, mental health information) and the following privacy measures apply:

- **Local-only storage:** Health profiles are stored as files in the `profiles/` directory on the user's machine. No data is sent to any external server except Anthropic's API for processing (same as any Claude Code conversation).
- **API data transmission disclosure:** Users should be informed during intake that their health data is processed by Claude via Anthropic's API and is subject to Anthropic's privacy policy. The Intake Agent displays a brief privacy notice before collecting sensitive data.
- **No version control for health data:** The `profiles/` and `findings/` directories are excluded from git via `.gitignore`. Users must not commit health data to version control.
- **Encryption:** v1 stores profiles as plain JSON/YAML. File-level encryption is deferred to a future version.
- **File permissions:** Profile files should be created with restrictive permissions (owner-read/write only). This is handled by the Intake Agent on profile creation.

## Architecture: Hybrid Pipeline + Swarm (3-Phase)

### Phase 1: Intake & Gating

Sequential pipeline that prepares and gates the analysis.

**Intake Agent** — Parses all user inputs (manual text + uploaded documents), extracts structured health data. Accepts file uploads at any point (lab PDFs, doctor's notes, imaging reports). Auto-detects document type and extracts key values. Conversational style — asks questions naturally, follows leads based on answers.

On first run: asks for a profile name (used as the profile file identifier, e.g., `profiles/my-health.json`). On subsequent runs: lists existing profiles and asks which to load, or offers to create a new one. Produces a structured health profile:

```json
{
  "profileName": "string",
  "createdAt": "ISO-8601 timestamp",
  "lastModified": "ISO-8601 timestamp",
  "symptoms": [{ "name", "severity", "duration", "patterns" }],
  "labValues": [{ "marker", "value", "unit", "referenceRange", "status" }],
  "medications": [{ "name", "dosage", "reason" }],
  "familyHistory": [{ "condition", "relationship" }],
  "lifestyle": { "diet", "exercise", "sleep", "stress", "substanceUse" },
  "concerns": ["user's own words about what bothers them"],
  "allergies": ["known allergies and sensitivities"],
  "version": 1
}
```

**Safety Gate Agent** — Runs before any analysis. Scans intake data and produces a graduated safety assessment with three states:

1. **HALT** — Acute danger detected. Do not proceed.
   - Acute danger signs: chest pain, severe bleeding, sudden weakness, suicidal ideation
   - Emergency lab values: critically high/low potassium, glucose, WBC, troponin
   - Active medications catalogued for later interaction checking
   - **Behavior:** Halt pipeline. Display warning directing user to medical care. No analysis performed.

2. **PROCEED WITH RESTRICTIONS** — Concerning but not acute findings detected.
   - Moderately elevated liver/kidney markers (not emergency-level but requiring follow-up)
   - History of anaphylaxis or severe allergies
   - Pregnancy or breastfeeding
   - Known autoimmune conditions or immunosuppression
   - **Behavior:** Proceed with analysis but apply restrictions:
     - Skip or restrict herb recommendations for liver/kidney impairment
     - Flag for enhanced Safety Review scrutiny in Phase 3
     - Prominently display "discuss with your doctor before starting any new supplements"
     - Certain specialist outputs may be restricted (e.g., no herbal recommendations during pregnancy)

3. **PROCEED NORMALLY** — No acute or concerning findings.
   - **Behavior:** Full pipeline with standard safety checks.

The Safety Gate passes its state and any restrictions downstream to Triage, domain specialists, and the Safety Review Agent.

**Triage Agent** — Determines which domain specialists to activate based on the health profile. Not every analysis needs all specialists. Produces:
- `activeDomains`: which specialists to run
- `priority`: which domain leads the analysis
- `skipDomains`: domains with insufficient data
- `round`: "full" (Round 1) or "follow-up" (Round 2+)
- `previousContext`: loaded from health profile if follow-up
- `safetyRestrictions`: propagated from Safety Gate

### Phase 2: Parallel Domain Analysis

Domain specialist agents run in parallel via Claude Code's parallel agent dispatch (using the Agent tool with multiple concurrent calls). Each specialist:
1. Reads relevant knowledge base files (curated holistic medicine data)
2. Runs targeted web research via MCP servers (PubMed, Examine.com, USDA nutrition)
3. Produces a domain report with findings, root causes, cross-domain connections, research sources, and recommendations

**Parallel Execution Constraints:**
- Claude Code supports multiple concurrent agent dispatches. The orchestrator launches all active domain specialists simultaneously.
- **Completion detection:** The orchestrator waits for all dispatched agents to return. Each specialist writes its findings file as its final action.
- **Timeout:** Each specialist has a 5-minute timeout. If a specialist times out, the orchestrator proceeds without its findings and notes the gap in the final report (e.g., "Genetic analysis was not completed — consider running a targeted follow-up").
- **Failure handling:** If a specialist fails (error, timeout), the orchestrator logs the failure and continues with available findings. The Protocol Generator notes any missing domains in the output.
- **Batching:** If active domains exceed practical parallel limits, the orchestrator batches them (e.g., 4 at a time) with no functional difference — only latency increases.

**MCP Server Availability & Degradation:**
- MCP servers are external dependencies and may be unavailable.
- **Fallback behavior:** If an MCP server is unreachable or returns an error, the specialist logs the failure and proceeds using only the curated knowledge base. The domain report includes a `researchLimited: true` flag with an explanation.
- **Downstream impact:** The Cross-Reference Agent and Protocol Generator note if any specialist had limited research. The Safety Review Agent applies extra scrutiny to recommendations that could not be verified via live research.
- **User notification:** The final output includes a note if web research was limited (e.g., "Some research sources were unavailable — recommendations are based on curated knowledge only. Consider verifying independently.")

**Active Domain Specialists (v1):**
1. **Gut Specialist** — Microbiome, digestion, nutrition absorption, food sensitivities, gut-brain axis
2. **Hormone Specialist** — Endocrine system, thyroid, cortisol, sex hormones, adrenal function
3. **Mind Specialist** — Stress, anxiety, cognitive function, nervous system, emotional patterns
4. **Genetic Specialist** — SNPs, hereditary patterns, MTHFR, genetic predispositions
5. **Sleep Specialist** — Sleep architecture, circadian rhythm, melatonin/cortisol cycles, sleep hygiene
6. **Immune & Inflammation Specialist** — Autoimmune patterns, chronic inflammation, immune modulation, CRP/ESR interpretation
7. **Musculoskeletal & Movement Specialist** — Joint health, muscle imbalances, fascia, posture, movement patterns, exercise prescription
8. **Ayurvedic Constitution Specialist** — Dosha analysis (Vata/Pitta/Kapha), prakriti/vikriti, ritucharya (seasonal protocols), dinacharya (daily routine), dravyaguna (herbal pharmacology)

**Future Domain Specialists (TODO):**
- Cardiovascular Specialist
- Detox & Liver Specialist
- Skin & Dermatology Specialist

Each domain specialist produces:
```json
{
  "domain": "gut",
  "sessionId": "unique-per-run",
  "findings": [{ "observation", "evidence", "confidence" }],
  "rootCauses": ["likely contributing factors"],
  "connections": ["hormone:cortisol", "sleep:melatonin"],
  "research": [{ "source", "title", "url", "relevance" }],
  "recommendations": [{ "type", "what", "why", "priority" }],
  "researchLimited": false,
  "researchLimitations": "null or explanation if MCP unavailable"
}
```

**Findings Bus:** Specialists run in parallel and write findings to the `findings/` directory. File naming: `findings/{domain}-{sessionId}.json` where `sessionId` is a unique ID generated by the orchestrator at the start of each run. Each specialist writes to its own file (no collisions). The orchestrator clears the `findings/` directory at the start of each session before dispatching specialists. The Cross-Reference Agent reads only files matching the current `sessionId`.

### Phase 3: Synthesis & Output

**Cross-Reference Agent** — Reads all domain reports and performs two functions:

1. **Connection identification:** Identifies positive cross-domain links (e.g., "gut inflammation is likely driving cortisol dysregulation, which explains the anxiety pattern").

2. **Conflict detection and resolution:** Identifies and resolves contradictions between specialist recommendations. For example:
   - Gut Specialist recommends fermented foods; Immune Specialist flags histamine intolerance and recommends avoiding fermented foods.
   - Ayurvedic Specialist recommends Pitta-pacifying diet; another specialist recommends foods that aggravate Pitta.

   **Resolution strategy (safety-first):**
   - When recommendations conflict, the more conservative/safer recommendation takes precedence.
   - If evidence strength differs significantly, the higher-evidence recommendation prevails (but the conflict is still disclosed).
   - The agent explicitly lists all conflicts found, the resolution chosen, and the rationale — so the user sees the tradeoff and can discuss with a practitioner.
   - Safety-related conflicts (e.g., herb-drug interactions) always override non-safety recommendations.

   The output includes a `conflicts` section:
   ```json
   {
     "conflicts": [{
       "domains": ["gut", "immune"],
       "recommendationA": { "from": "gut", "what": "fermented foods daily" },
       "recommendationB": { "from": "immune", "what": "avoid fermented foods (histamine)" },
       "resolution": "Avoid fermented foods pending histamine evaluation",
       "rationale": "Safety-first: histamine intolerance risk takes precedence over general microbiome benefit"
     }]
   }
   ```

**Safety Review Agent** — Standalone agent (file: `agents/safety-review.md`). Audits the entire protocol before output:
- Herb-drug interactions (cross-check every herb against every medication via interactions database)
- Contraindications (pregnancy, liver/kidney issues, allergies, surgeries)
- Dose safety (flag doses above established safe ranges)
- Language audit (scan for anything that could be read as a diagnosis or medical claim)
- Applies any restrictions propagated from the Safety Gate (Phase 1)
- Applies extra scrutiny to recommendations from specialists with limited research (`researchLimited: true`)

If issues found: strip or modify the problematic recommendation, add advisory note.

**Protocol Generator** — Produces the final output with consistent structure:
1. Executive Summary — 3-5 sentences: what was found, what is recommended, what to watch
2. Research Findings — organized by domain, with cited sources and evidence levels
3. Potential Conditions — flagged with confidence level, always with advisory language ("consider discussing with your practitioner")
4. Cross-Domain Connections — key insights from the Cross-Reference Agent
5. Conflicts & Resolutions — any specialist disagreements and how they were resolved
6. Action Plan — prioritized as Start This Week / Monitor / Explore Later, with specific dosages, frequencies, durations
7. Red Flags & Warnings — prominently displayed with clear next steps
8. Follow-Up Plan — what to track, when to check back, what to report
9. Research Limitations — note if any MCP servers were unavailable

## Iterative Health Model

HolisticDrive is an ongoing health partnership, not a one-shot cure. It follows a cycle:

1. **Initial Intake** — Full health history, symptoms, lab results, documents
2. **Deep Analysis & Protocol** — Full pipeline: all domain specialists, cross-reference, action plan
3. **Focused Action Plan** — Prioritized recommendations: what to start, what to monitor
4. **Check-in & Follow-up** — How are you feeling? What changed? Any new symptoms?
5. **Re-assessment** — What worked? What didn't? New labs? Adjust protocol.
6. **Repeat** — Each round is more targeted than the last

### Variable Depth per Round

- **Round 1 (Full):** All relevant domain specialists activated, deep web research, comprehensive baseline protocol
- **Round N (Follow-up):** Only re-run specialists for areas being tracked, research focuses on "why isn't X working?", adjust existing protocol rather than rebuild

### Iterative Principles (Embedded in Agent Prompts)

- "Start low, go slow" — first protocols introduce 2-3 changes, not 20
- "Observe before adding" — give changes time to work before layering more
- "Address root causes, not symptoms" — but acknowledge symptom relief matters too
- "Not everything needs fixing at once" — prioritize by impact and safety

### Persistent Health Profile

Each person has a local health profile file in `profiles/` that accumulates across sessions:
- Baseline data (from first intake)
- Protocols issued (what was recommended, when, at what priority)
- Check-in responses (how the person reported feeling at each follow-up)
- Adjustments made (what changed between rounds and why)
- User feedback on previous recommendations

The Intake Agent loads the existing profile automatically on follow-up rounds.

**Profile Identity:** On first run, the user is asked for a profile name (used as the file identifier, e.g., `profiles/my-health.json`). On subsequent runs, existing profiles are listed and the user selects one or creates a new one. v1 is single-user per Claude Code instance; multi-user/practitioner mode is deferred.

**Profile Versioning:** Profiles use an append-only session log. Each session writes a new entry (timestamped) to the profile file rather than overwriting. This provides:
- Full history: every recommendation, check-in, and adjustment is preserved
- Rollback capability: previous states can be recovered by reading the session log
- Corruption recovery: if a profile is partially written, the Intake Agent validates the JSON structure and falls back to the last complete session entry if corruption is detected

The Intake Agent validates the profile file before loading (checks for valid JSON, required fields, non-corrupt session log).

**Feedback Capture:** The `/holistic-checkin` skill explicitly asks:
- Were the previous recommendations followed?
- Did any recommendation cause adverse effects?
- Were any perceived as helpful?

This feedback is stored in the profile and used to adjust future recommendations (e.g., "user reported ashwagandha caused GI distress — avoid or modify in future protocols").

## Plugin Structure

```
holistic-drive/
  plugin.json                    # Plugin manifest (see Plugin Manifest section)
  CLAUDE.md                      # Project instructions for Claude
  .mcp.json                      # MCP server configuration
  agents/
    orchestrator.md              # Phase 1 → Phase 2 → Phase 3 coordinator
    intake.md                    # Parse inputs, extract structured data
    safety-gate.md               # Red flag detection, graduated safety scoring
    safety-review.md             # Phase 3 protocol audit (standalone agent)
    triage.md                    # Route to domain specialists
    domains/
      gut.md
      hormone.md
      mind.md
      genetic.md
      sleep.md
      immune.md
      musculoskeletal.md
      ayurveda.md
      # TODO: cardiovascular.md, detox.md, skin.md
    cross-reference.md           # Synthesize across domains + conflict resolution
    protocol-generator.md        # Final output: report + action plan
  skills/
    holistic-review.md           # Main skill: full analysis (Round 1)
    holistic-checkin.md          # Follow-up skill (Round 2+)
    holistic-research.md         # Targeted deep dive on specific topic
    holistic-status.md           # View current protocol snapshot
  knowledge-base/
    foods/                       # Nutritional profiles, healing properties
    herbs/                       # Herbal monographs, dosages, interactions
    exercises/                   # Movement protocols, contraindications
    ayurveda/                    # Dosha reference, seasonal protocols, dinacharya
    conditions/                  # Holistic condition reference cards
    interactions/                # Herb-drug, herb-herb, food-drug, contraindications
  profiles/                      # Persistent health profiles (per person, local files)
  findings/                      # Temp directory for specialist findings (per session, gitignored)
```

### Plugin Manifest (`plugin.json`)

The plugin manifest registers all agents, skills, and MCP servers with Claude Code:

```json
{
  "name": "holistic-drive",
  "version": "0.1.0",
  "description": "Agentic holistic health research framework — iterative health analysis with domain specialists, curated knowledge base, and safety layers",
  "agents": {
    "orchestrator": "agents/orchestrator.md",
    "intake": "agents/intake.md",
    "safety-gate": "agents/safety-gate.md",
    "safety-review": "agents/safety-review.md",
    "triage": "agents/triage.md",
    "cross-reference": "agents/cross-reference.md",
    "protocol-generator": "agents/protocol-generator.md",
    "domains/gut": "agents/domains/gut.md",
    "domains/hormone": "agents/domains/hormone.md",
    "domains/mind": "agents/domains/mind.md",
    "domains/genetic": "agents/domains/genetic.md",
    "domains/sleep": "agents/domains/sleep.md",
    "domains/immune": "agents/domains/immune.md",
    "domains/musculoskeletal": "agents/domains/musculoskeletal.md",
    "domains/ayurveda": "agents/domains/ayurveda.md"
  },
  "skills": {
    "holistic-review": "skills/holistic-review.md",
    "holistic-checkin": "skills/holistic-checkin.md",
    "holistic-research": "skills/holistic-research.md",
    "holistic-status": "skills/holistic-status.md"
  }
}
```

MCP server configuration lives in `.mcp.json` at the plugin root (separate from the manifest).

## User-Facing Skills

### `/holistic-review` — Full Analysis (Round 1)

Conversational intake that adapts based on what the person shares. On first run, asks for a profile name and displays a privacy notice before collecting health data. Accepts file uploads anytime. Runs the full three-phase pipeline. Produces complete research report + action plan + red flags. Saves health profile for future sessions.

### `/holistic-checkin` — Follow-up (Round 2+)

Loads existing health profile automatically (prompts for profile selection if multiple exist). Shows current protocol items. Asks what improved, what didn't, any new symptoms or labs. Captures feedback on previous recommendations (followed? helpful? adverse effects?). Runs targeted re-analysis on affected domains only. Adjusts protocol and updates health profile.

### `/holistic-research` — Targeted Deep Dive

Skips full intake, researches a specific topic deeply. Uses knowledge base + MCP web research. Outputs evidence summary with holistic perspective. Context-aware: reads health profile if it exists.

### `/holistic-status` — Current Protocol Snapshot

Displays current protocol at a glance. Active recommendations, what to monitor, next check-in date. No analysis, just current state. If no health profile exists, displays a message directing the user to run `/holistic-review` for an initial analysis.

## Safety Model

### Three-Layer Defense

**Layer 1 — Upfront Safety Gate (Phase 1):** Scans intake and produces a graduated safety assessment:
- **HALT** — Acute danger: halt pipeline, direct to medical care.
- **PROCEED WITH RESTRICTIONS** — Concerning findings: proceed but restrict certain outputs (e.g., no herb recommendations during pregnancy, enhanced scrutiny for liver impairment).
- **PROCEED NORMALLY** — No concerns: full pipeline.

Safety state and restrictions propagate to all downstream agents (Triage, specialists, Safety Review).

**Layer 2 — Embedded in Domain Specialists:** Each specialist prompt includes domain-specific safety rules. Herb recommendations always cross-reference active medications. Language is always advisory ("may suggest", "is associated with"), never diagnostic. Specialists respect any restrictions propagated from the Safety Gate.

**Layer 3 — Final Safety Review (Phase 3):** Standalone Safety Review Agent audits entire protocol — herb-drug interactions, contraindications, dose safety, language audit. Applies extra scrutiny to recommendations from specialists with limited research. Strips or modifies problematic recommendations. Adds advisory notes.

### Language Standards

The system never:
- Claims to diagnose, treat, or cure any condition
- Recommends stopping prescribed medications
- Presents holistic recommendations as alternatives to medical treatment
- Uses definitive diagnostic language

The system always:
- Uses advisory language: "may suggest", "is associated with", "consider discussing with your practitioner"
- Flags potential conditions with confidence levels and referral advisories
- Recommends medical follow-up for anything outside holistic scope
- Acknowledges the limitations of holistic approaches

## Knowledge Base Structure

### Categories

- **foods/** — Anti-inflammatory, gut-healing, hormone-supporting, sleep-promoting, nutrient-dense (organized by key nutrient)
- **herbs/** — Adaptogens, gut herbs, nervine herbs, immune modulators, plus individual monographs in `monographs/`
- **exercises/** — Restorative (yoga, tai chi), strength, cardio, breathwork
- **ayurveda/** — Doshas, ritucharya (seasonal), dinacharya (daily routine), ahara (dietary principles), dravyaguna (herbal pharmacology)
- **conditions/** — Holistic perspective cards per condition (IBS, Hashimoto's, adrenal fatigue, insomnia, etc.)
- **interactions/** — Herb-drug, herb-herb, food-drug, contraindications (pregnancy, liver disease, bleeding disorders)

### Entry Format

Each knowledge base entry follows a consistent structure:
- Category and primary uses
- Ayurvedic context (rasa, virya, vipaka, dosha effects)
- Evidence level (with key sources)
- Key compounds
- Typical dose, form, duration
- Cautions and contraindications
- Drug interactions
- Key research references

Knowledge base is structured markdown — version-controlled, human-auditable, no infrastructure needed.

### Knowledge Base Content Strategy (v1)

The knowledge base can be bootstrapped incrementally — the system functions with an empty knowledge base (relying solely on MCP web research), but curated content improves quality and reduces API calls. Minimum v1 content targets:

**Blocking dependencies (required before first meaningful run):**
- `interactions/` — Core herb-drug, herb-herb, and contraindication data (safety-critical)
- `conditions/` — At least 10 common condition reference cards

**High-priority (significantly improves output quality):**
- `herbs/monographs/` — Top 30 most-referenced herbs with full monographs
- `foods/` — Top 20 food category files (anti-inflammatory, gut-healing, etc.)
- `ayurveda/doshas.md` — Core dosha reference

**Can be deferred:**
- `exercises/` — Specialists can generate exercise recommendations from general knowledge
- Extended herb monographs beyond the top 30
- Additional condition cards beyond the initial 10

Content sourcing: publicly available databases, established textbooks (e.g., "The Yoga of Herbs" by Frawley & Lad, "Medical Herbalism" by Hoffman), peer-reviewed journals. Each entry must cite sources.

## MCP Server Integration

Configured via `.mcp.json` at the plugin root. Domain agents call MCP tools as needed during their research phase:

- **PubMed/NCBI** — Research paper search for evidence-based support
- **Examine.com** — Supplement and nutrition evidence database
- **USDA Nutrition** — Food composition and nutrient data lookup

**Degradation:** If an MCP server is unavailable, specialists fall back to curated knowledge base only. The domain report flags `researchLimited: true` with an explanation. The final output notes any research limitations.

## Technical Decisions

- **Agents as Markdown Prompts:** Each agent is a `.md` file with frontmatter (model, tools, description) and a system prompt. No code to deploy. Domain specialists are self-contained — adding a new domain is creating one markdown file.
- **Knowledge Base as Structured Markdown:** Version-controlled, human-auditable, no database infrastructure. Agents read files as context.
- **Health Profiles as Local Files:** JSON/YAML files in `profiles/` directory. No database, no cloud storage. Fully local. Append-only session log for history and rollback.
- **Findings as Shared Files:** Specialists write to `findings/` directory during parallel execution. File naming: `{domain}-{sessionId}.json`. Orchestrator clears directory at session start. Cross-Reference Agent reads only current session files.
- **Model Flexibility:** Each agent can use a different model (e.g., Haiku for fast triage, Opus for deep cross-referencing) via frontmatter configuration.
- **Parallel Agent Dispatch:** Orchestrator launches all active specialists simultaneously via Claude Code's Agent tool. 5-minute timeout per specialist. Failures are logged and pipeline continues without missing specialists, noted in final output.
