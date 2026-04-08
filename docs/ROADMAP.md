# Roadmap

## v0.1 — Current

- [x] Plugin foundation (manifest, CLAUDE.md, MCP config)
- [x] 3 Phase 1 agents (Intake, Safety Gate, Triage)
- [x] 9 Phase 2 domain specialists
- [x] 3 Phase 3 synthesis agents (Cross-Reference, Safety Review, Protocol Generator)
- [x] Orchestrator agent
- [x] 4 user-facing skills (/holistic-review, /holistic-checkin, /holistic-research, /holistic-status)
- [x] Knowledge base: 4 interactions files, 10 condition cards, 5 Ayurveda files, 32 herb monographs, 4 herb indexes, 10 food category files
- [x] WebSearch integration in all domain specialists
- [x] MCP server config (PubMed, Examine.com, USDA — placeholder, disabled by default)
- [x] Three-layer safety model (Safety Gate → Safety Review → Language Audit)
- [x] Iterative health model (full analysis + follow-up rounds)
- [x] MIT license, open source

## v0.2 — Quality & Testing

- [ ] End-to-end pipeline testing (full /holistic-review run)
- [ ] Validate specialist findings output format
- [ ] Cross-reference conflict resolution testing
- [ ] Safety Review interaction checking validation
- [ ] Additional condition cards (10 more: cardiovascular, fatty liver, SIBO, osteoporosis, rheumatoid arthritis, endometriosis, bipolar, ADHD, celiac, chronic fatigue)
- [ ] Additional food category files (10 more to reach spec target of 20)
- [ ] GitHub Actions CI (lint agent frontmatter, validate plugin structure, check knowledge base file format)

## v0.3 — Expanded Knowledge Base

- [ ] Exercises knowledge base (`knowledge-base/exercises/`) — movement protocols, contraindications by condition, exercise prescriptions
- [ ] Extended herb monographs (additional 20+ herbs beyond the current 32)
- [ ] Drug-nutrient depletion database — common medications and their nutrient depletion effects
- [ ] Lab reference ranges — functional vs. standard ranges for key markers

## v0.4 — New Domain Specialists

- [ ] Cardiovascular Specialist — heart health, blood pressure, cholesterol, vascular function
- [ ] Detox & Liver Specialist — detoxification pathways, liver support, environmental toxin assessment
- [ ] Skin & Dermatology Specialist — eczema, psoriasis, acne, skin-gut axis, topical protocols

## v0.5 — Enhanced Features

- [ ] Profile encryption — file-level encryption for health profiles at rest
- [ ] Multi-user / practitioner mode — support multiple profiles per Claude Code instance
- [ ] Protocol export — PDF/Markdown export of generated protocols
- [ ] Lab result tracking — visual trend tracking across sessions
- [ ] MCP server activation — enable PubMed, Examine.com, USDA when packages are available
- [ ] Community contributions — herb monographs, condition cards, food profiles from contributors
