import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from '../../lib/logger';
import { db } from '../../lib/db';
import weights from '../../config/scoring_weights.json';

const AGENT = 'evaluator';

export async function runEvaluator(): Promise<void> {
  logger.info(AGENT, 'Starting evaluator run');

  // Fetch un-evaluated ideas
  const { data: ideas, error } = await db
    .from('ideas')
    .select('*')
    .is('evaluated_at', null)
    .limit(50);

  if (error) throw error;
  if (!ideas || ideas.length === 0) {
    logger.info(AGENT, 'No new ideas to evaluate');
    return;
  }

  logger.info(AGENT, `Evaluating ${ideas.length} ideas`);

  for (const idea of ideas) {
    const score = scoreIdea(idea);

    await db.from('evaluations').insert({
      idea_id: idea.id,
      score_total: score.scoreTotal,
      score_breakdown: score.scoreBreakdown,
      recommendation: score.recommendation,
      notes: score.notes,
    });

    // Mark idea as evaluated
    await db.from('ideas').update({ evaluated_at: new Date().toISOString() }).eq('id', idea.id);

    logger.info(AGENT, `${idea.title} → ${score.recommendation} (${score.scoreTotal}/100)`);
  }

  logger.info(AGENT, 'Evaluator complete');
}

function scoreIdea(idea: any) {
  const breakdown = {
    demand:              scoreDemand(idea),
    monetization:        scoreMonetization(idea),
    competition:         scoreCompetition(idea),
    automationPotential: scoreAutomation(idea),
    buildComplexity:     scoreBuildComplexity(idea),
  };

  const scoreTotal = Math.round(
    breakdown.demand             * (weights.demand             * 10) +
    breakdown.monetization       * (weights.monetization       * 10) +
    breakdown.competition        * (weights.competition        * 10) +
    breakdown.automationPotential* (weights.automationPotential* 10) +
    breakdown.buildComplexity    * (weights.buildComplexity    * 10)
  );

  const recommendation =
    scoreTotal >= weights.thresholds.BUILD ? 'BUILD' :
    scoreTotal >= weights.thresholds.WATCH ? 'WATCH' : 'DROP';

  const notes = buildNotes(idea, breakdown);

  return { scoreTotal, scoreBreakdown: breakdown, recommendation, notes };
}

// ── Scoring functions — now use structured brief fields ───────────────────────

function scoreDemand(idea: any): number {
  let score = 4; // baseline

  // Signal count: multiple independent sources = strong demand
  const signalCount = idea.signal_count ?? 1;
  if (signalCount >= 3) score += 4;
  else if (signalCount >= 2) score += 2;

  // Confidence set by LLM
  if (idea.confidence === 'high') score += 2;
  else if (idea.confidence === 'medium') score += 1;

  // Specific audience = more targetable demand
  const audience = (idea.audience ?? '').toLowerCase();
  if (audience && audience !== 'unknown' && audience.split(' ').length <= 6) score += 1;

  return Math.min(score, 10);
}

function scoreMonetization(idea: any): number {
  let score = 4;

  const monetization: string[] = idea.monetization ?? [];
  if (monetization.length >= 3) score += 3;
  else if (monetization.length >= 1) score += 1;

  // High-value monetization signals
  const monetizationText = monetization.join(' ').toLowerCase();
  if (/subscription|saas|recurring/i.test(monetizationText)) score += 2;
  if (/b2b|business|agency|professional/i.test(idea.audience ?? '')) score += 1;

  return Math.min(score, 10);
}

function scoreCompetition(idea: any): number {
  // Default neutral — will improve with SerpAPI in Phase 2
  const workaround = (idea.workaround ?? '').toLowerCase();

  // If workaround is "manual" or "nothing" = weak competition
  if (/manual|spreadsheet|nothing|don't|no tool/i.test(workaround)) return 7;
  return 5;
}

function scoreAutomation(idea: any): number {
  let score = 5;

  const products: string[] = idea.product_possibilities ?? [];
  const productText = products.join(' ').toLowerCase();

  if (/directory|aggregator|list|database/i.test(productText)) score += 3;
  if (/automation|tool|scraper|monitor|alert|tracker/i.test(productText)) score += 2;
  if (/saas|app|extension/i.test(productText)) score += 1;

  return Math.min(score, 10);
}

function scoreBuildComplexity(idea: any): number {
  // Invert: higher score = simpler to build (better)
  const products: string[] = idea.product_possibilities ?? [];
  const productText = products.join(' ').toLowerCase();

  if (/marketplace|social network|real-time|platform/i.test(productText)) return 3;
  if (/directory|newsletter|template|prompt/i.test(productText)) return 9;
  if (/chrome extension|browser/i.test(productText)) return 8;
  if (/saas|tool/i.test(productText)) return 6;
  return 6;
}

function buildNotes(idea: any, breakdown: Record<string, number>): string {
  const parts: string[] = [];
  if ((idea.signal_count ?? 1) >= 2) parts.push(`${idea.signal_count} independent signals`);
  if (idea.confidence === 'high') parts.push('high LLM confidence');
  if (breakdown.demand >= 8) parts.push('strong demand');
  if (breakdown.monetization >= 8) parts.push('clear monetization');
  if (breakdown.buildComplexity >= 8) parts.push('simple to build');
  return parts.join(', ');
}

