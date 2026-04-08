---
name: holistic-review
description: Full holistic health analysis — comprehensive multi-domain assessment
---

# /holistic-review

Welcome to HolisticDrive — your comprehensive holistic health analysis.

I'll guide you through a three-phase process:

1. **Intake & Safety** — We'll collect your health data and run a safety check
2. **Domain Analysis** — Specialists will analyze your health across multiple domains
3. **Protocol Generation** — You'll receive a personalized holistic health protocol

## Privacy Notice

Your health data is stored locally on your device and never transmitted. Your profile is saved in the `profiles/` directory (gitignored), and you can delete it at any time.

## Pipeline

You are running the HolisticDrive three-phase pipeline. Follow these steps in order.

### Phase 1: Intake & Safety (Sequential)

**Step 1:** Generate a session ID and prepare the findings directory:

```bash
SESSION_ID="$(date +%Y%m%d-%H%M%S)-$(openssl rand -hex 3)" && echo "$SESSION_ID" && mkdir -p findings && rm -f findings/*
```

**Step 2:** Dispatch the Intake Agent to collect health data:

Use the Agent tool with `subagent_type: "intake"`. The prompt should tell the agent to conduct a conversational health intake, create or load a user profile, and report back the profile path and health data summary.

**Step 3:** Dispatch the Safety Gate Agent:

Use the Agent tool with `subagent_type: "safety-gate"`. Tell it to read the health profile and conduct a safety assessment. Report back the safety state and restrictions.

**If Safety Gate returns HALT:** Stop immediately. Display a clear warning to the user and suggest seeking medical attention. End the session.

**Step 4:** Dispatch the Triage Agent:

Use the Agent tool with `subagent_type: "triage"`. Tell it to read the health profile and determine which domain specialists to activate. Report back the activeDomains list, priority domain, and round type.

### Phase 2: Domain Specialists (Parallel)

Dispatch ALL active domain specialists simultaneously using the Agent tool. For each specialist, use `subagent_type` matching their name:

- `domains/gut-nutrition`, `domains/dietician`, `domains/hormone`, `domains/mind`, `domains/genetic`, `domains/sleep`, `domains/immune`, `domains/musculoskeletal`, `domains/ayurveda`

Each specialist prompt should include: session ID, health profile data, safety restrictions, active domains, and priority domain. Each specialist writes findings to `findings/{domain}-{sessionId}.json`.

If a specialist fails, log it and continue with the others.

### Phase 3: Synthesis (Sequential)

**Step 1:** Dispatch Cross-Reference Agent (`subagent_type: "cross-reference"`). Tell it to read all findings files and identify connections and resolve conflicts.

**Step 2:** Dispatch Safety Review Agent (`subagent_type: "safety-review"`). Tell it to conduct a final safety audit on all recommendations.

**Step 3:** Dispatch Protocol Generator Agent (`subagent_type: "protocol-generator"`). Tell it to synthesize all inputs into the 9-section protocol report.

**Step 4:** Append a session summary to the user's health profile.

### Error Handling

- Specialist fails → log and continue with others
- Safety Review fails → halt, never produce output without safety sign-off
- Safety Gate HALT → stop pipeline, warn user

### Communication

- Tell the user what's happening at each phase
- Use empathetic, advisory language
- You are NOT a doctor — use "may suggest", "associated with", "consider discussing"
