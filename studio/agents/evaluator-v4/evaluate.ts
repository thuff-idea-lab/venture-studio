import { callLLM } from '../../lib/llm';
import { logger } from '../../lib/logger';
import type { IdeasV4Row, LLMEvaluation, DimensionScores } from './types';

const EVALUATION_PROMPT = `You are a venture evaluator for a solo software builder.

Your job: given a product idea with its validation data, score it on 6 dimensions.

FOUNDER CONTEXT
- Solo technical builder who ships fast
- Can build: web apps, browser extensions, bots, APIs, templates, newsletters, data products, widgets, SaaS, directories, calculators, automations
- Cannot build: hardware, native mobile apps, anything regulated (finance, healthcare, legal compliance), enterprise products needing sales teams
- Budget: $0/month operating cost preferred, under $50/month max
- Goal: products that reach $100+/month revenue within 6 months

SCORE EACH DIMENSION 1-10:

1. problem_clarity (weight: 20%)
   - 1-3: Vague or hypothetical pain. "People might want..." or "It would be nice if..."
   - 4-6: Real pain but generic. Could apply to many people without being urgent for anyone specific.
   - 7-8: Specific, recurring pain with clear frequency. You can picture the person hitting this problem.
   - 9-10: Acute, frequent pain with evidence. The person is actively working around this today with a bad solution.

2. target_user (weight: 15%)
   - 1-3: A demographic or category ("small businesses", "millennials")
   - 4-6: A role but still broad ("freelancers", "teachers")
   - 7-8: A specific person in a specific situation ("Etsy sellers managing 50+ listings")
   - 9-10: A person you could find and message today with a clear profile

3. build_feasibility (weight: 20%)
   - 1-3: Requires a team, complex infrastructure, or data that doesn't exist
   - 4-6: Buildable solo but significant complexity (40+ hours, multiple integrations)
   - 7-8: Clear, focused V1 achievable in 20-30 hours
   - 9-10: Dead simple V1 in under 15 hours — CRUD app, calculator, template, or single-purpose tool

4. revenue_path (weight: 15%)
   - 1-3: "Maybe ads" or "freemium somehow" — no specific willingness to pay
   - 4-6: Plausible path but unproven ("subscription for premium features")
   - 7-8: Clear value-for-money trade — user saves time/money worth more than the price
   - 9-10: Users are already paying for worse alternatives, or the ROI is obvious and immediate

5. distribution (weight: 15%)
   - 1-3: "SEO" or "social media" with no specifics
   - 4-6: Identifiable channels but no clear hooks (subreddits exist but cold posting rarely works)
   - 7-8: Specific communities where this solves an active discussion topic. Can post where the pain is discussed.
   - 9-10: Built-in distribution — marketplace listing, platform integration, or community where the founder is already present

6. timing (weight: 15%)
   - 1-3: No reason this is better now than 2 years ago
   - 4-6: Mild timing advantage (growing trend, new platform feature)
   - 7-8: Clear inflection point — regulation change, platform shift, or emerging behavior
   - 9-10: Urgent window — competitors haven't caught up to a rapid change

Also provide:
- strengths: 2-4 bullet points — what's genuinely strong about this idea
- risks: 2-4 bullet points — what could go wrong or what's weak
- reasoning: 2-3 sentences — your overall assessment

VALIDATION DATA CONTEXT:
The idea comes with external validation data. Use this to inform your scores:
- demand.autocomplete_match = true means people actually search for this (boosts problem_clarity)
- competition_level = NONE/WEAK means opportunity exists (boosts timing, distribution)
- competition_level = STRONG means the market is crowded (lower scores unless there's a clear wedge)
- trend = RISING boosts timing, DECLINING lowers it
- These are FACTS from external APIs, not opinions — weight them accordingly

Return ONLY valid JSON (no markdown, no explanation outside the JSON):
{
  "scores": {
    "problem_clarity": 0,
    "target_user": 0,
    "build_feasibility": 0,
    "revenue_path": 0,
    "distribution": 0,
    "timing": 0
  },
  "strengths": ["...", "..."],
  "risks": ["...", "..."],
  "reasoning": "..."
}`;

function formatIdeaForLLM(idea: IdeasV4Row): string {
  const validation = idea.validation_data ?? {};

  return [
    `IDEA: ${idea.title}`,
    `Product Shape: ${idea.product_shape}`,
    `Target User: ${idea.target_user}`,
    `Pain: ${idea.pain}`,
    `Frequency: ${idea.frequency}`,
    `V1 Description: ${idea.v1_description}`,
    `Monetization: ${idea.monetization}`,
    `Distribution: ${idea.distribution}`,
    `Why Now: ${idea.why_now}`,
    `Build Hours Estimate: ${idea.build_hours_estimate}`,
    `Scout Confidence: ${idea.confidence}`,
    `Strategy Found By: ${idea.strategy}`,
    `Sources: ${idea.sources?.map(s => `${s.platform} (${s.strategy})`).join(', ') || 'unknown'}`,
    '',
    'VALIDATION DATA:',
    `Demand — Autocomplete Match: ${validation.demand?.autocomplete_match ?? 'unknown'}`,
    `Demand — Related Searches: ${validation.demand?.related_completions?.join(', ') || 'none'}`,
    `Competition Level: ${validation.competition?.competition_level ?? 'UNKNOWN'}`,
    `Competition — Top Results: ${validation.competition?.top_results_summary?.join('; ') || 'none'}`,
    `Trend Direction: ${validation.trend?.trend ?? 'NO_DATA'}`,
    `Trend Interest Score: ${validation.trend?.interest_score ?? 'N/A'}`,
  ].join('\n');
}

function clampScore(score: number): number {
  return Math.max(1, Math.min(10, Math.round(score)));
}

/**
 * Evaluate an idea using the LLM. Returns dimension scores + qualitative assessment.
 */
export async function evaluateWithLLM(idea: IdeasV4Row): Promise<LLMEvaluation | null> {
  const ideaText = formatIdeaForLLM(idea);
  const fullPrompt = `${EVALUATION_PROMPT}\n\n---\n\n${ideaText}`;

  try {
    const response = await callLLM(fullPrompt);
    const trimmed = response.trim();

    // Handle markdown code blocks
    let jsonStr = trimmed;
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and clamp scores
    const scores: DimensionScores = {
      problem_clarity: clampScore(parsed.scores?.problem_clarity ?? 5),
      target_user: clampScore(parsed.scores?.target_user ?? 5),
      build_feasibility: clampScore(parsed.scores?.build_feasibility ?? 5),
      revenue_path: clampScore(parsed.scores?.revenue_path ?? 5),
      distribution: clampScore(parsed.scores?.distribution ?? 5),
      timing: clampScore(parsed.scores?.timing ?? 5),
    };

    return {
      scores,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 4) : [],
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    };
  } catch (err: any) {
    logger.warn('evaluator-v4', `LLM evaluation failed for "${idea.title}": ${err.message}`);
    return null;
  }
}
