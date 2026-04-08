# Contributing to HolisticDrive

Thanks for your interest in contributing! HolisticDrive is an open-source holistic health research framework for Claude Code. Here's how to help.

## Ways to Contribute

### Knowledge Base Content (Most Impactful)

The knowledge base is the backbone of HolisticDrive's recommendations. Contributing curated, evidence-based content directly improves output quality.

**What's needed:**
- **Condition reference cards** — `knowledge-base/conditions/<condition>.md`
- **Herb monographs** — `knowledge-base/herbs/monographs/<herb>.md`
- **Food category files** — `knowledge-base/foods/<category>.md`
- **Exercise protocols** — `knowledge-base/exercises/<category>.md`

**Follow the existing format exactly.** Each file type has a specific structure — read 2-3 existing files before writing a new one.

#### Condition Card Template

```markdown
# [Condition Name]

## Holistic Perspective
[Brief overview through a holistic lens — root causes, interconnected systems]

## Common Patterns
- Related symptoms that co-occur
- Lab markers to watch
- Body systems typically involved

## Holistic Approaches
### Nutrition
### Herbal Medicine
### Ayurvedic Perspective
### Movement & Exercise
### Mind & Stress

## Cross-Domain Connections
[Which specialists should be consulted]

## Red Flags
[When to refer to medical care]

## Key Sources
[1] Author, "Title", Journal, Year
```

#### Herb Monograph Template

```markdown
# [Herb Name] (Botanical name)

## Profile
- Category: Adaptogen / Nervine / Gut herb / etc.
- Ayurvedic: Rasa, virya, vipaka, prabhava, dosha effects
- Primary uses: [list]

## Evidence
- Evidence level: Low / Moderate / Strong
- Key studies: [citations]

## Key Compounds
[Active constituents]

## Dosing
- Typical dose, form, duration

## Cautions & Contraindications
[Who should avoid]

## Drug Interactions
[Specific medications]

## Key Sources
[References]
```

### Bug Reports & Fixes

- **Agents not producing correct output** — check the agent's prompt in `agents/` and the findings output format
- **Safety checks missing interactions** — update `knowledge-base/interactions/` files
- **Skill invocation issues** — check `skills/*/SKILL.md` and `.claude-plugin/` config

### New Domain Specialists

See `docs/ROADMAP.md` for planned specialists. Each specialist needs:
- `agents/domains/<name>.md` — agent prompt with analysis framework
- Entry in the triage agent's routing table
- Entry in the orchestrator's specialist mapping
- Relevant knowledge base content

## Guidelines

### Content Standards

1. **Evidence-based** — cite sources for all claims. Prefer peer-reviewed studies.
2. **Advisory language only** — "may suggest", "is associated with", "consider discussing". Never "will cure", "treat", or diagnostic claims.
3. **Safety-first** — always include contraindications, drug interactions, and red flags.
4. **Ayurvedic context** — include dosha effects (V↓ P↓ K↓) where applicable.
5. **Concise** — reference cards should be scannable, not encyclopedic.

### Code Standards

1. **Agent prompts are markdown** — follow existing frontmatter format exactly (`name`, `description`, `model`, `tools`).
2. **Skills live in subdirectories** — `skills/<name>/SKILL.md`.
3. **No AskUserQuestion in domain agents** — they run headless during parallel Phase 2.
4. **Knowledge base files are plain markdown** — tables preferred over prose for reference data.

### Commit Messages

- `feat:` for new features (agents, skills, knowledge base content)
- `fix:` for bug fixes
- `docs:` for documentation changes
- `chore:` for maintenance

Example: `feat: add cardiovascular condition reference card`

## Development Setup

```bash
git clone git@github.com:rolan86/HolisticDrive.git
cd HolisticDrive

# Register as local marketplace
claude plugin marketplace add ./

# Install plugin
claude plugin install holistic-drive@holistic-drive-marketplace --scope project

# Reload in Claude Code
/reload-plugins
```

## Testing

HolisticDrive is a prompt-based system (no traditional code tests). Validation happens through:

1. **Plugin validation** — `claude plugin validate ./`
2. **Agent invocation** — run `/holistic-review` and verify each phase completes
3. **Knowledge base consistency** — check that agent references to KB files match actual file paths
4. **Safety audit** — verify Safety Review catches known interactions

## Questions?

Open a [GitHub Discussion](https://github.com/rolan86/HolisticDrive/discussions) or [Issue](https://github.com/rolan86/HolisticDrive/issues).
