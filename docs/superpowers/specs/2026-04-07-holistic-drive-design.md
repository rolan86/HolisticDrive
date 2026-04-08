# HolisticDrive — Agentic Holistic Health Research Framework

## Overview

HolisticDrive is a Claude Code plugin that provides personalized holistic health research and recommendations. It is an iterative health system — not a one-shot analysis tool — that acts as a research specialist, guide, and holistic practitioner. It does not replace medical care; it provides evidence-informed holistic recommendations while flagging anything that warrants professional attention.

**Primary user:** Individuals seeking holistic health guidance (self-service).
**Execution environment:** Claude Code native — built as a plugin with agents, skills, and MCP servers. No web app, no database, no deployment.
**Core modalities:** Nutrition, herbal medicine, exercise/movement, Ayurveda, sleep optimization, and stress/mind practices.

## Architecture: Hybrid Pipeline + Swarm (3-Phase)

### Phase 1: Intake & Gating

Sequential pipeline that prepares and gates the analysis.

**Intake Agent** — Parses all user inputs (manual text + uploaded documents), extracts structured health data. Accepts file uploads at any point (lab PDFs, doctor's notes, imaging reports). Auto-detects document type and extracts key values. Conversational style — asks questions naturally, follows leads based on answers. Produces a structured health profile:

```json
{
  "symptoms": [{ "name", "severity", "duration", "patterns" }],
  "labValues": [{ "marker", "value", "unit", "referenceRange", "status" }],
  "medications": [{ "name", "dosage", "reason" }],
  "familyHistory": [{ "condition", "relationship" }],
  "lifestyle": { "diet", "exercise", "sleep", "stress", "substanceUse" },
  "concerns": ["user's own words about what bothers them"]
}
```

**Safety Gate Agent** — Runs before any analysis. Scans intake data for:
- Acute danger signs (chest pain, severe bleeding, sudden weakness, suicidal ideation)
- Emergency lab values (critically high/low potassium, glucose, WBC)
- Active medications (catalogued for interaction checking)

If triggered: halts pipeline, displays warning directing user to medical care. Does not proceed with analysis.

**Triage Agent** — Determines which domain specialists to activate based on the health profile. Not every analysis needs all specialists. Produces:
- `activeDomains`: which specialists to run
- `priority`: which domain leads the analysis
- `skipDomains`: domains with insufficient data
- `round`: "full" (Round 1) or "follow-up" (Round 2+)
- `previousContext`: loaded from health profile if follow-up

### Phase 2: Parallel Domain Analysis

Domain specialist agents run in parallel via Claude Code's parallel agent dispatch. Each specialist:
1. Reads relevant knowledge base files (curated holistic medicine data)
2. Runs targeted web research via MCP servers (PubMed, Examine.com, USDA nutrition)
3. Produces a domain report with findings, root causes, cross-domain connections, research sources, and recommendations

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
  "findings": [{ "observation", "evidence", "confidence" }],
  "rootCauses": ["likely contributing factors"],
  "connections": ["hormone:cortisol", "sleep:melatonin"],
  "research": [{ "source", "title", "url", "relevance" }],
  "recommendations": [{ "type", "what", "why", "priority" }]
}
```

**Findings Bus:** Specialists run in parallel and write findings to a shared `findings/` directory. They declare cross-domain "connections" as hints. The Cross-Reference Agent reads all findings after completion — no direct inter-agent communication needed.

### Phase 3: Synthesis & Output

**Cross-Reference Agent** — Reads all domain reports and identifies connections across systems (e.g., "gut inflammation is likely driving cortisol dysregulation, which explains the anxiety pattern").

**Safety Review Agent** — Audits the entire protocol before output:
- Herb-drug interactions (cross-check every herb against every medication via interactions database)
- Contraindications (pregnancy, liver/kidney issues, allergies, surgeries)
- Dose safety (flag doses above established safe ranges)
- Language audit (scan for anything that could be read as a diagnosis or medical claim)

If issues found: strip or modify the problematic recommendation, add advisory note.

**Protocol Generator** — Produces the final output with consistent structure:
1. Executive Summary — 3-5 sentences: what was found, what is recommended, what to watch
2. Research Findings — organized by domain, with cited sources and evidence levels
3. Potential Conditions — flagged with confidence level, always with advisory language ("consider discussing with your practitioner")
4. Action Plan — prioritized as Start This Week / Monitor / Explore Later, with specific dosages, frequencies, durations
5. Red Flags & Warnings — prominently displayed with clear next steps
6. Follow-Up Plan — what to track, when to check back, what to report

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

The Intake Agent loads the existing profile automatically on follow-up rounds.

## Plugin Structure

```
holistic-drive/
  plugin.json                    # Plugin manifest
  CLAUDE.md                      # Project instructions for Claude
  agents/
    orchestrator.md              # Phase 1 → Phase 2 → Phase 3 coordinator
    intake.md                    # Parse inputs, extract structured data
    safety-gate.md               # Red flag detection, urgency scoring
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
    cross-reference.md           # Synthesize across domains
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
  mcp-servers/
    .mcp.json                    # MCP server configuration
    pubmed/                      # PubMed/NCBI research search
    examine/                     # Examine.com supplement evidence
    nutrition-db/                # USDA nutrition data lookup
  profiles/                      # Persistent health profiles (per person, local files)
  findings/                      # Temp directory for specialist findings (per session)
```

## User-Facing Skills

### `/holistic-review` — Full Analysis (Round 1)

Conversational intake that adapts based on what the person shares. Accepts file uploads anytime. Runs the full three-phase pipeline. Produces complete research report + action plan + red flags. Saves health profile for future sessions.

### `/holistic-checkin` — Follow-up (Round 2+)

Loads existing health profile automatically. Shows current protocol items. Asks what improved, what didn't, any new symptoms or labs. Runs targeted re-analysis on affected domains only. Adjusts protocol and updates health profile.

### `/holistic-research` — Targeted Deep Dive

Skips full intake, researches a specific topic deeply. Uses knowledge base + MCP web research. Outputs evidence summary with holistic perspective. Context-aware: reads health profile if it exists.

### `/holistic-status` — Current Protocol Snapshot

Displays current protocol at a glance. Active recommendations, what to monitor, next check-in date. No analysis, just current state.

## Safety Model

### Three-Layer Defense

**Layer 1 — Upfront Safety Gate (Phase 1):** Scans intake for acute danger signs, emergency lab values, active medications. Halts pipeline if triggered. Never proceeds with analysis for urgent cases.

**Layer 2 — Embedded in Domain Specialists:** Each specialist prompt includes domain-specific safety rules. Herb recommendations always cross-reference active medications. Language is always advisory ("may suggest", "is associated with"), never diagnostic.

**Layer 3 — Final Safety Review (Phase 3):** Audits entire protocol — herb-drug interactions, contraindications, dose safety, language audit. Strips or modifies problematic recommendations. Adds advisory notes.

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

## MCP Server Integration

Configured via `.mcp.json` in the plugin. Domain agents call MCP tools as needed during their research phase:

- **PubMed/NCBI** — Research paper search for evidence-based support
- **Examine.com** — Supplement and nutrition evidence database
- **USDA Nutrition** — Food composition and nutrient data lookup

## Technical Decisions

- **Agents as Markdown Prompts:** Each agent is a `.md` file with frontmatter (model, tools, description) and a system prompt. No code to deploy. Domain specialists are self-contained — adding a new domain is creating one markdown file.
- **Knowledge Base as Structured Markdown:** Version-controlled, human-auditable, no database infrastructure. Agents read files as context.
- **Health Profiles as Local Files:** JSON/YAML files in `profiles/` directory. No database, no cloud storage. Fully local.
- **Findings as Shared Files:** Specialists write to `findings/` directory during parallel execution. Cross-Reference Agent reads them after completion.
- **Model Flexibility:** Each agent can use a different model (e.g., Haiku for fast triage, Opus for deep cross-referencing) via frontmatter configuration.
