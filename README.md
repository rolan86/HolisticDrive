<p align="center">
  <img src="assets/logo.svg" width="120" alt="HolisticDrive Logo">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code_Plugin-16_Agents_%7C_4_Skills_%7C_65_KB_Files-blue?style=for-the-badge" alt="Plugin Scale">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Safety-3_Layer_Graduated-orange?style=for-the-badge" alt="Safety Model">
  <img src="https://img.shields.io/badge/Architecture-Hybrid_Pipeline_%2B_Swarm-purple?style=for-the-badge" alt="Architecture">
</p>

<h1 align="center">HolisticDrive</h1>

<p align="center">
  <strong>Agentic holistic health research framework for Claude Code.</strong><br>
  Iterative multi-domain analysis with 9 specialists, a curated knowledge base, and graduated safety.
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#usage">Usage</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="docs/ROADMAP.md">Roadmap</a> ·
  <a href="LICENSE">License</a>
</p>

---

> **HolisticDrive is NOT a doctor.** It is a research specialist and holistic health guide. It provides evidence-informed recommendations — never medical diagnoses or treatments.

## How It Works

HolisticDrive runs a three-phase pipeline:

```
Phase 1: Sequential Safety Pipeline
  Intake → Safety Gate → Triage

Phase 2: Parallel Domain Analysis
  9 domain specialists analyze simultaneously

Phase 3: Sequential Synthesis
  Cross-Reference → Safety Review → Protocol Generator
```

1. **Intake** — Conversational health data collection, profile management, document parsing
2. **Safety Gate** — Graduated 3-state assessment (HALT / PROCEED WITH RESTRICTIONS / PROCEED NORMALLY)
3. **Triage** — Routes to the appropriate domain specialists based on health profile
4. **Domain Specialists** — 9 parallel specialists analyze different body systems
5. **Cross-Reference** — Identifies connections and resolves conflicts across domains
6. **Safety Review** — Final audit: herb-drug interactions, contraindications, language check
7. **Protocol Generator** — Produces structured 9-section output with prioritized action plan

## Getting Started

### Prerequisites

- [Claude Code](https://claude.com/claude-code) CLI installed

### Installation

```bash
# 1. Clone this repository
git clone https://github.com/rolan86/holistic-drive.git
cd holistic-drive

# 2. Register as a local marketplace
claude plugin marketplace add ./

# 3. Install the plugin (project-scoped)
claude plugin install holistic-drive@holistic-drive-marketplace --scope project

# 4. Restart Claude Code or run /reload-plugins
```

To install globally (available in all projects), use `--scope user` instead of `--scope project`.

### Uninstall

```bash
claude plugin uninstall holistic-drive@holistic-drive-marketplace
claude plugin marketplace remove holistic-drive-marketplace
```

## Usage

| Command | Description |
|---------|-------------|
| `/holistic-review` | Full holistic health analysis (new users or comprehensive review) |
| `/holistic-checkin` | Follow-up session — track progress and adjust your protocol |
| `/holistic-research <topic>` | Targeted deep dive on a specific health topic |
| `/holistic-status` | View current protocol snapshot |

### Iterative Health Model

HolisticDrive is designed for ongoing use, not one-shot analysis:

- **Round 1** — Full pipeline, comprehensive assessment, "start low, go slow" (max 5 changes)
- **Round N+** — Targeted follow-up: what improved, what didn't, adjust protocol

Health profiles persist locally across sessions. Each session appends to the profile history.

## Architecture

### Agents (16)

| Phase | Agent | Role |
|-------|-------|------|
| 1 | Intake | Conversational health data collection |
| 1 | Safety Gate | Danger sign detection, safety assessment |
| 1 | Triage | Domain routing and prioritization |
| 2 | Gut & Nutrition | Microbiome, digestion, nutrient analysis |
| 2 | Dietician & Culinary | Meal planning, cuisine blending, recipe adaptation |
| 2 | Hormone | Endocrine system, thyroid, cortisol, sex hormones |
| 2 | Mind | Stress, anxiety, nervous system regulation |
| 2 | Genetic | SNPs, nutrigenomics, epigenetic factors |
| 2 | Sleep | Sleep architecture, circadian rhythm |
| 2 | Immune & Inflammation | Autoimmune patterns, chronic inflammation |
| 2 | Musculoskeletal & Movement | Joint health, movement patterns, exercise |
| 2 | Ayurvedic Constitution | Dosha analysis, ritucharya, dinacharya, dravyaguna |
| 3 | Cross-Reference | Connection identification, conflict resolution |
| 3 | Safety Review | Final safety audit, interaction checking |
| 3 | Protocol Generator | Structured output generation |
| — | Orchestrator | Pipeline coordinator |

### Safety Model

Three-layer graduated safety:

1. **Safety Gate (Phase 1)** — Scans health profile for acute danger signs. HALT stops the pipeline entirely.
2. **Safety Review (Phase 3)** — Cross-checks every herb recommendation against medications, contraindications, and doses.
3. **Language Audit** — Enforces advisory language throughout. No diagnostic claims, no "will cure", no definitive statements.

Safety restrictions propagate through the entire pipeline to all downstream agents.

### Knowledge Base

65 curated reference files covering:

- **Interactions** — Herb-drug, herb-herb, food-drug interactions and population contraindications
- **Conditions** — 10 condition reference cards (IBS, Hashimoto's, PCOS, insomnia, anxiety, depression, etc.)
- **Ayurveda** — Doshas, ritucharya, dinacharya, ahara, dravyaguna
- **Herbs** — 32 individual monographs + 4 category indexes
- **Foods** — 10 food category files with nutritional profiles and Ayurvedic context

### Data Privacy

- Health profiles stored locally in `profiles/` (gitignored)
- Specialist findings stored in `findings/` (gitignored, per-session temp)
- Knowledge base is version-controlled and human-auditable
- No data is transmitted externally

## Project Structure

```
holistic-drive/
├── .claude-plugin/
│   ├── plugin.json          # Plugin manifest
│   └── marketplace.json     # Marketplace registration
├── CLAUDE.md                # Project instructions
├── .mcp.json                # MCP server config (disabled by default)
├── agents/
│   ├── orchestrator.md      # Pipeline coordinator
│   ├── intake.md            # Health data collection
│   ├── safety-gate.md       # Phase 1 safety assessment
│   ├── triage.md            # Domain routing
│   ├── cross-reference.md   # Conflict resolution
│   ├── safety-review.md     # Phase 3 safety audit
│   ├── protocol-generator.md # Output generation
│   └── domains/             # 9 domain specialists
├── skills/
│   ├── holistic-review/     # Full analysis entry point
│   ├── holistic-checkin/    # Follow-up session
│   ├── holistic-research/   # Targeted research
│   └── holistic-status/     # Protocol snapshot
├── knowledge-base/          # Curated reference library
│   ├── interactions/        # Safety-critical interaction data
│   ├── conditions/          # Condition reference cards
│   ├── ayurveda/            # Ayurvedic knowledge
│   ├── herbs/               # Monographs + category indexes
│   └── foods/               # Food category profiles
├── profiles/                # User health profiles (gitignored)
└── findings/                # Session findings (gitignored)
```

## MCP Integration

HolisticDrive supports optional MCP servers for live research:

- **PubMed** — Biomedical literature search
- **Examine.com** — Supplement and nutrition evidence
- **USDA Nutrition** — Food composition data

MCP servers start disabled and can be enabled in `.mcp.json`. All domain specialists work with or without MCP (knowledge base fallback).

## License

[MIT](LICENSE) — This project is provided for educational and research purposes only. It does not constitute medical advice.

## Author

Built and maintained by [Merryl D'Mello](https://reposition.dev). I write about multi-agent system design and reliable AI workflows, and run free workshops on both at [REPOSITION](https://reposition.dev).
