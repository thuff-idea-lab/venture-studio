# Venture Studio

AI-powered portfolio system that continuously discovers, evaluates, plans, builds, and scales internet business assets.

## Docs
- [Master Canvas](../documentation/ai_internet_venture_studio.md)
- [AI Strategy](../documentation/docs/AI_STRATEGY.md)
- [Tools & Integrations](../documentation/docs/TOOLS_AND_INTEGRATIONS.md)
- [Validation Strategy](../documentation/docs/VALIDATION_STRATEGY.md)
- [Sprint 0 Checklist](../documentation/docs/SPRINT_0_CHECKLIST.md)

## Quick Start
```bash
npm install
cp .env.example .env   # fill in your values
npm run pipeline       # run Scout → Evaluator → Planner
```

## Phase 1 Agents
- **Scout** — discovers ideas from Reddit RSS, HN, Google Trends
- **Evaluator** — scores ideas on demand, monetization, competition
- **Planner** — generates project plans for BUILD-rated ideas
