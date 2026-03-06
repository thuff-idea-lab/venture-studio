import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from '../../lib/logger';
import { db } from '../../lib/db';
import weights from '../../config/scoring_weights.json';

const AGENT = 'evaluator';

export async function runEvaluator(): Promise<void> {
  logger.info(AGENT, 'Starting evaluator run');

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

    await db.from('ideas').update({ evaluated_at: new Date().toISOString() }).eq('id', idea.id);

    logger.info(AGENT, `${idea.title} → ${score.recommendation} (${score.scoreTotal}/100)`);
  }

  logger.info(AGENT, 'Evaluator complete');
}

function scoreIdea(idea: any) {
  const breakdown = {
    painClarity:    scorePainClarity(idea),
    userClarity:    scoreUserClarity(idea),
    monetization:   scoreMonetization(idea),
    mvpFeasibility: scoreMvpFeasibility(idea),
    founderFit:     scoreFounderFit(idea),
    distribution:   scoreDistribution(idea),
    repeatability:  scoreRepeatability(idea),
  };

  const rawScore = Math.round(
    breakdown.painClarity    * (weights.painClarity    * 10) +
    breakdown.userClarity    * (weights.userClarity    * 10) +
    breakdown.monetization   * (weights.monetization   * 10) +
    breakdown.mvpFeasibility * (weights.mvpFeasibility * 10) +
    breakdown.founderFit     * (weights.founderFit     * 10) +
    breakdown.distribution   * (weights.distribution   * 10) +
    breakdown.repeatability  * (weights.repeatability  * 10)
  );

  const { finalScore, penaltyNotes } = applyPenalties(idea, rawScore);

  const recommendation =
    finalScore >= weights.thresholds.BUILD ? 'BUILD' :
    finalScore >= weights.thresholds.WATCH ? 'WATCH' : 'DROP';

  const notes = buildNotes(idea, breakdown, penaltyNotes);
  return { scoreTotal: finalScore, scoreBreakdown: breakdown, recommendation, notes };
}

// ── Scoring functions ─────────────────────────────────────────────────────────

function scorePainClarity(idea: any): number {
  let score = 4;
  const signalCount = idea.signal_count ?? 1;
  if (signalCount >= 3) score += 4;
  else if (signalCount >= 2) score += 2;
  if (idea.confidence === 'high') score += 2;
  else if (idea.confidence === 'medium') score += 1;
  // Specific workaround = pain is real and not vague
  const workaround = (idea.workaround ?? '').toLowerCase();
  if (/spreadsheet|manual|gmail|copy.paste|multiple tools|no tool|nothing|4 tools/i.test(workaround)) score += 1;
  return Math.min(score, 10);
}

function scoreUserClarity(idea: any): number {
  const audience = (idea.audience ?? '').trim().toLowerCase();
  if (!audience || audience.length < 5) return 2;
  if (/^(everyone|businesses|developers|consumers|users|people|companies|internet users)$/i.test(audience)) return 2;
  if (/\b(seller|freelancer|agency|owner|manager|buyer|small business|solo|creator|operator|service business)\b/i.test(audience)) return 9;
  const wordCount = audience.split(' ').length;
  if (wordCount >= 3 && wordCount <= 8) return 7;
  if (wordCount >= 2) return 5;
  return 4;
}

function scoreMonetization(idea: any): number {
  let score = 4;
  const monetization: string[] = idea.monetization ?? [];
  if (monetization.length >= 3) score += 3;
  else if (monetization.length >= 1) score += 1;
  const text = monetization.join(' ').toLowerCase();
  if (/subscription|saas|recurring/i.test(text)) score += 2;
  if (/affiliate|lead.gen|sponsorship/i.test(text)) score += 1;
  return Math.min(score, 10);
}

function scoreMvpFeasibility(idea: any): number {
  const products: string[] = idea.product_possibilities ?? [];
  const allText = (products.join(' ') + ' ' + (idea.mvp_idea ?? '')).toLowerCase();
  if (/calculator|quiz|comparison|affiliate|directory|template|prompt/i.test(allText)) return 9;
  if (/dashboard|newsletter|chrome extension|browser tool/i.test(allText)) return 8;
  if (/automation|workflow tool|saas/i.test(allText)) return 7;
  if (/marketplace|social network|real-time multi-user|platform/i.test(allText)) return 3;
  return 6;
}

function scoreFounderFit(idea: any): number {
  // Start with the LLM's own founder-fit self-assessment (1-10)
  let score = Math.min(10, Math.max(1, idea.founder_fit_score ?? 5));

  const allText = [
    idea.title ?? '',
    idea.pain ?? '',
    ...(idea.product_possibilities ?? []),
    ...(idea.founder_fit_reason ?? []),
  ].join(' ').toLowerCase();

  // Hard cap for specialist/security/trust signals
  if (/security|cryptograph|encryption|compliance|hipaa|soc2|penetration test|exploit|vulnerability|regulat|infrastructure|kernel|distributed system/i.test(allText)) {
    score = Math.min(score, 3);
  }

  // Boost for founder-native V1 shapes
  if (/calculator|comparison|directory|dashboard|automation|affiliate|newsletter|template|integration|workflow tool/i.test(allText)) {
    score = Math.min(score + 2, 10);
  }

  // Boost for explicit founder-fit reasoning
  if ((idea.founder_fit_reason ?? []).length >= 2) score = Math.min(score + 1, 10);

  return score;
}

function scoreDistribution(idea: any): number {
  const paths: string[] = idea.distribution_paths ?? [];
  if (paths.length === 0) return 4;
  const text = paths.join(' ').toLowerCase();
  if (/seo|search|community|reddit|niche.*forum|content marketing/i.test(text)) return 9;
  if (/outreach|direct|email|cold/i.test(text)) return 6;
  if (paths.length >= 2) return 7;
  return 5;
}

function scoreRepeatability(idea: any): number {
  const freq = (idea.frequency ?? 'unknown').toLowerCase();
  if (/daily|every sale|every client|every transaction/i.test(freq)) return 10;
  if (/weekly|every project|every invoice|per transaction/i.test(freq)) return 8;
  if (/monthly|per buying decision/i.test(freq)) return 6;
  return 5; // unknown
}

// ── Penalty logic ─────────────────────────────────────────────────────────────

function applyPenalties(idea: any, rawScore: number): { finalScore: number; penaltyNotes: string[] } {
  let score = rawScore;
  const penaltyNotes: string[] = [];
  const allText = [idea.title, idea.pain, idea.audience, ...(idea.product_possibilities ?? [])].join(' ').toLowerCase();

  if (/security|cryptograph|encryption|penetration.*test|exploit|vulnerability assessment/i.test(allText)) {
    score -= 20;
    penaltyNotes.push('specialist/security-heavy (-20)');
  }
  if (/regulated|hipaa|soc2|gdpr.*complian|medical.*diagnos|legal.*advice|licensed.*professional/i.test(allText)) {
    score -= 20;
    penaltyNotes.push('regulated/trust-critical (-20)');
  }
  if (/kernel|bare.metal|core infrastructure|distributed system/i.test(allText)) {
    score -= 15;
    penaltyNotes.push('deep infrastructure (-15)');
  }
  if (/^(everyone|businesses|consumers|developers|users|people|companies|internet users)$/i.test((idea.audience ?? '').trim().toLowerCase())) {
    score -= 15;
    penaltyNotes.push('audience too vague (-15)');
  }

  return { finalScore: Math.max(0, score), penaltyNotes };
}

// ── Notes builder ─────────────────────────────────────────────────────────────

function buildNotes(idea: any, breakdown: Record<string, number>, penalties: string[]): string {
  const parts: string[] = [];
  if ((idea.signal_count ?? 1) >= 2) parts.push(`${idea.signal_count} signals`);
  if (idea.confidence === 'high') parts.push('high LLM confidence');
  if (breakdown.founderFit >= 8) parts.push('strong founder fit');
  if (breakdown.painClarity >= 8) parts.push('clear pain');
  if (breakdown.mvpFeasibility >= 8) parts.push('simple V1');
  if (breakdown.monetization >= 8) parts.push('clear monetization');
  if (breakdown.distribution >= 8) parts.push('clear distribution');
  if (penalties.length > 0) parts.push(...penalties);
  return parts.join(' | ');
}

