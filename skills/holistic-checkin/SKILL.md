---
name: holistic-checkin
description: Follow-up check-in — track progress and adjust your holistic health protocol
---

# /holistic-checkin

Follow-up check-in for existing HolisticDrive users. Captures feedback on your previous protocol, tracks progress, and adjusts recommendations based on what's working and what isn't.

## How It Works

1. **Select Your Profile** — Lists available profiles from `profiles/` or prompts you to choose
2. **Review Current Protocol** — Displays your most recent session summary and recommendations
3. **Share Your Experience** — Collects feedback on what improved, what didn't, new symptoms, new lab results, adherence to recommendations, and any adverse effects
4. **Generate Adjusted Protocol** — Runs the three-phase pipeline with `round="follow-up"` to update your holistic health plan
5. **Highlight Changes** — Shows what's different from your previous protocol

## What You'll Need

- An existing health profile in `profiles/` (created during your first session)
- Your previous protocol summary (loaded automatically from your profile)

## Your Feedback Matters

This check-in focuses on:
- **What improved** since your last session
- **What didn't improve** or worsened
- **Any new symptoms** or concerns
- **Any new lab results** to review
- **Recommendation adherence** — which recommendations you followed and which you didn't
- **Any adverse effects** or unexpected reactions

Your feedback helps refine the protocol — highlighting what's working, adjusting what isn't, and introducing new supportive changes only when needed.

## Orchestrator Invocation

This skill invokes the Orchestrator Agent with:

```json
{
  "round": "follow-up",
  "profilePath": "/path/to/your/profile.json",
  "checkInData": {
    "improvements": ["what improved"],
    "noChange": ["what didn't improve"],
    "newSymptoms": ["any new symptoms"],
    "newLabResults": ["any new lab values"],
    "adherence": ["recommendations followed"],
    "notFollowed": ["recommendations not followed"],
    "adverseEffects": ["any adverse reactions"]
  }
}
```

The Orchestrator runs the full three-phase pipeline (Intake → Safety Gate → Triage → Domain Specialists → Cross-Reference → Safety Review → Protocol Generator) with your previous context and check-in data, producing an updated protocol.

## Start Your Check-In

Ready to review your progress? Let's start by selecting your profile.
