// ── DISTRIBUTION.md Generator ─────────────────────────────────────────────────
// LLM-generated step-by-step launch playbook with specific channels and actions.

import { callLLM } from '../../lib/llm';
import type { PlannerInput } from './types';

export async function generateDistribution(input: PlannerInput): Promise<string> {
  const { idea, evaluation } = input;
  const vd = idea.validation_data ?? {};

  const competitionContext = vd.competition
    ? `Competition level: ${vd.competition.competition_level}. Top results: ${(vd.competition.top_results_summary || []).join('; ')}`
    : 'No competition data available.';

  const demandContext = vd.demand
    ? `Autocomplete match: ${vd.demand.autocomplete_match}. Related searches: ${(vd.demand.related_completions || []).join(', ')}`
    : 'No demand data available.';

  const prompt = `You are a growth marketer writing a step-by-step launch playbook for a solo founder shipping an MVP. This founder is not a marketer — they need EXACT steps, not strategy advice.

PRODUCT CONTEXT:
- Title: ${idea.title}
- Summary: ${idea.summary}
- Target User: ${idea.target_user}
- Problem: ${idea.pain}
- Product Shape: ${idea.product_shape}
- Monetization: ${idea.monetization}
- Distribution hints: ${idea.distribution}
- ${demandContext}
- ${competitionContext}

PLAYBOOK RULES:
- Every step must be a concrete ACTION, not a strategy label.
- Name SPECIFIC communities, subreddits, forums, newsletters, or platforms — not "find relevant communities."
- Include example post titles and angles for each channel. Not "share on Reddit" but "Post to r/freelance with angle: 'I built X after Y happened to me.'"
- Budget is $0 unless absolutely necessary. Organic channels first.
- Include exact metrics to track and specific go/no-go criteria with numbers and timeframes.
- The founder will be doing this themselves — keep it realistic for one person.

Write the launch playbook in markdown format with EXACTLY these sections:

## 1. Pre-Launch Checklist (Day 0-1)
List every setup task before going live:
- Analytics setup (what tool, what events to track)
- Landing page essentials (headline formula, what must be above the fold)
- Social profiles or accounts to create
- Communities to join or lurk in before posting
- Email capture setup (if applicable)

## 2. Launch Week (Day 1-7)
For each channel, write a specific action plan:

### Channel: [Name]
- **Where exactly:** URL or specific group/subreddit name
- **When to post:** Day and time
- **Post title/angle:** Exact title or framing to use
- **Post body approach:** 2-3 sentences on what the post should say
- **Expected outcome:** What a good response looks like
- **Follow-up:** What to do with comments/responses

Repeat for 3-5 channels, ordered by expected impact.

## 3. Validation Criteria
Define clear go/no-go metrics:
- **Continue building if:** [specific number] of [specific action] within [specific timeframe]
- **Pivot if:** [what signals suggest the angle is wrong but the problem is real]
- **Kill if:** [what signals mean this isn't worth pursuing]

Be realistic — this is an MVP, not a Series A launch.

## 4. Week 2-4 Playbook
Two paths:

### If traction is working:
- What to double down on
- What content to create
- How to convert early users to paying customers
- When and how to ask for feedback

### If traction is NOT working:
- How to diagnose what's wrong (product vs. positioning vs. audience)
- What to try differently
- When to officially kill it

## 5. SEO Quick Wins (if applicable)
If this product can attract search traffic:
- Target keywords (specific, long-tail)
- Pages to create for SEO
- Internal linking approach

If SEO doesn't apply to this product, skip this section entirely.

Do NOT wrap the entire output in a code block. Write it as clean markdown.`;

  const response = await callLLM(prompt, { temperature: 0.4 });
  return cleanMarkdownResponse(response);
}

function cleanMarkdownResponse(response: string): string {
  let cleaned = response.trim();
  if (cleaned.startsWith('```markdown')) {
    cleaned = cleaned.slice('```markdown'.length);
  } else if (cleaned.startsWith('```md')) {
    cleaned = cleaned.slice('```md'.length);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}
