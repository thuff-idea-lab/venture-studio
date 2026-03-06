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
    demand:              estimateDemand(idea),
    monetization:        estimateMonetization(idea),
    competition:         estimateCompetition(idea),
    automationPotential: estimateAutomation(idea),
    buildComplexity:     estimateBuildComplexity(idea),
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

  return { scoreTotal, scoreBreakdown: breakdown, recommendation, notes: '' };
}

// ── Rule-based scoring (no LLM needed) ───────────────────────────────────────

function estimateDemand(idea: any): number {
  const evidenceCount = idea.evidence?.length ?? 0;
  if (evidenceCount >= 3) return 8;
  if (evidenceCount >= 1) return 6;
  return 4;
}

function estimateMonetization(idea: any): number {
  const monetizationKeywords = ['tool', 'software', 'saas', 'paid', 'premium', 'subscription', 'service'];
  const title = (idea.title ?? '').toLowerCase();
  return monetizationKeywords.some(k => title.includes(k)) ? 7 : 5;
}

function estimateCompetition(idea: any): number {
  // Will improve with SerpAPI in Phase 2 — default to neutral
  return 5;
}

function estimateAutomation(idea: any): number {
  const automationKeywords = ['directory', 'list', 'aggregator', 'tracker', 'monitor', 'alert'];
  const title = (idea.title ?? '').toLowerCase();
  return automationKeywords.some(k => title.includes(k)) ? 8 : 5;
}

function estimateBuildComplexity(idea: any): number {
  // Invert complexity — higher score = simpler to build (better)
  const complexKeywords = ['marketplace', 'platform', 'social', 'network', 'real-time'];
  const title = (idea.title ?? '').toLowerCase();
  return complexKeywords.some(k => title.includes(k)) ? 4 : 7;
}
