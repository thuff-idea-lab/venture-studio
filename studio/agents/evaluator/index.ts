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

  const { finalScore, penaltyNotes, bonusNotes } = applyPortfolioAdjustments(idea, breakdown, rawScore);

  const recommendation =
    finalScore >= weights.thresholds.BUILD ? 'BUILD' :
    finalScore >= weights.thresholds.WATCH ? 'WATCH' : 'DROP';

  const notes = buildNotes(idea, breakdown, penaltyNotes, bonusNotes);
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
  if (/^(everyone|businesses|small businesses|developers|consumers|users|people|companies|internet users|creators|founders|teams)$/i.test(audience)) return 2;

  const weakBroadMatches = /\b(small business|creator|buyer|seller|owner|manager|operator|agency|freelancer)\b/i.test(audience);
  const wordCount = audience.split(/\s+/).filter(Boolean).length;

  if (wordCount >= 4 && wordCount <= 10) return weakBroadMatches ? 7 : 9;
  if (wordCount >= 3) return weakBroadMatches ? 6 : 8;
  if (wordCount >= 2) return weakBroadMatches ? 4 : 6;
  return 3;
}

function scoreMonetization(idea: any): number {
  let score = 4;
  const monetization: string[] = idea.monetization ?? [];
  if (monetization.length >= 3) score += 3;
  else if (monetization.length >= 1) score += 1;
  const text = monetization.join(' ').toLowerCase();
  if (/subscription|saas|recurring/i.test(text)) score += 2;
  if (/affiliate|lead.gen|sponsorship/i.test(text)) score += 1;
  if (/subscription|affiliate|leadgen|lead generation|productized service|digital product|recurring/i.test(text)) score += 1;
  return Math.min(score, 10);
}

function scoreMvpFeasibility(idea: any): number {
  const products: string[] = idea.product_possibilities ?? idea.productPossibilities ?? [];
  const allText = (products.join(' ') + ' ' + (idea.mvp_idea ?? idea.mvpIdea ?? '')).toLowerCase();

  if (/calculator|estimator|quiz|comparison|affiliate|directory|checklist|diagnostic|finder/i.test(allText)) return 9;
  if (/template|prompt|search tool|research helper|resizer|optimizer|generator/i.test(allText)) return 8;
  if (/dashboard|workflow tool|scheduler|saas|platform|management|tracker/i.test(allText)) return 5;
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
  const paths: string[] = idea.distribution_paths ?? idea.distributionPaths ?? [];
  if (paths.length === 0) return 3;

  const specificPaths = paths.filter((path: string) => {
    const text = (path ?? '').trim().toLowerCase();
    if (!text) return false;
    if (/^(seo|reddit|x|communities|social media|content marketing|ads)$/i.test(text)) return false;
    return text.length >= 18;
  });

  if (specificPaths.length === 0) return 3;

  const text = specificPaths.join(' ').toLowerCase();
  let score = 5;

  if (/r\/[a-z0-9_]+|specific subreddit|forum|etsy sellers|parent groups|cold outreach|freelance designers|local providers|search traffic for high-intent|comparison queries|calculator queries/i.test(text)) {
    score += 2;
  }

  if (/marketplace|etsy|shopify|app store|partner|directory listing|affiliate/i.test(text)) {
    score += 1;
  }

  if (specificPaths.length >= 2) score += 1;

  return Math.min(score, 10);
}

function scoreRepeatability(idea: any): number {
  const freq = (idea.frequency ?? 'unknown').toLowerCase();
  if (/daily|every sale|every client|every transaction/i.test(freq)) return 10;
  if (/weekly|every project|every invoice|per transaction/i.test(freq)) return 8;
  if (/monthly|per buying decision/i.test(freq)) return 6;
  return 4;
}

// ── Penalty logic ─────────────────────────────────────────────────────────────

function applyPortfolioAdjustments(
  idea: any,
  breakdown: Record<string, number>,
  rawScore: number
): { finalScore: number; penaltyNotes: string[]; bonusNotes: string[] } {
  let score = rawScore;
  const penaltyNotes: string[] = [];
  const bonusNotes: string[] = [];
  const allText = [idea.title, idea.pain, idea.audience, ...(idea.product_possibilities ?? [])].join(' ').toLowerCase();
  const summaryText = [
    idea.summary ?? '',
    idea.why_now ?? '',
    ...(idea.distribution_paths ?? []),
    ...(idea.monetization ?? []),
    ...(idea.product_possibilities ?? []),
  ].join(' ').toLowerCase();

  const evidenceConfidence = idea.evidence_confidence ?? idea.evidenceConfidence ?? idea.confidence ?? 'low';
  const opportunityConfidence = idea.opportunity_confidence ?? idea.opportunityConfidence ?? idea.confidence ?? 'low';
  const sourceTypeCount = idea.source_type_count ?? idea.sourceTypeCount ?? 1;
  const signalCount = idea.signal_count ?? idea.signalCount ?? 1;

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

  if (/\b(dashboard|management|workflow|platform|system|portal|tracker)\b/i.test(allText) && !/\bfor\b/.test(allText)) {
    score -= 12;
    penaltyNotes.push('generic software category without wedge (-12)');
  }

  if (evidenceConfidence === 'low' && signalCount < 2) {
    score -= 12;
    penaltyNotes.push('weak evidence / single-signal idea (-12)');
  }

  if (sourceTypeCount < 2 && signalCount < 2) {
    score -= 6;
    penaltyNotes.push('limited source diversity (-6)');
  }

  if (breakdown.distribution <= 4) {
    score -= 10;
    penaltyNotes.push('generic or weak distribution path (-10)');
  }

  const baseHitSignals = [
    breakdown.mvpFeasibility >= 8,
    breakdown.founderFit >= 8,
    breakdown.monetization >= 7,
    breakdown.repeatability >= 7,
    breakdown.distribution >= 7,
  ].filter(Boolean).length;

  if (baseHitSignals >= 4 && /template|directory|comparison|calculator|generator|search|finder|diagnostic|estimator|quiz/i.test(summaryText)) {
    score += 6;
    bonusNotes.push('sharp V1 profile (+6)');
  }

  const homerunSignals = [
    breakdown.painClarity >= 9,
    breakdown.userClarity >= 8,
    breakdown.monetization >= 8,
    breakdown.distribution >= 8,
  ].filter(Boolean).length;

  if (homerunSignals >= 3 && breakdown.mvpFeasibility >= 7 && evidenceConfidence !== 'low' && /expensive incumbent|bloated|search|comparison|directory|calculator|estimator|diagnostic/i.test(`${buildNotes(idea, breakdown, [], [])} ${summaryText}`)) {
    score += 4;
    bonusNotes.push('exceptional upside path (+4)');
  }

  const inMiddleZone =
    breakdown.mvpFeasibility <= 6 &&
    breakdown.founderFit <= 7 &&
    breakdown.monetization <= 6 &&
    breakdown.distribution <= 6;

  if (inMiddleZone) {
    score -= 10;
    penaltyNotes.push('fuzzy middle-zone idea (-10)');
  }

  if (/guide|course|agency|service-only|consulting|done-for-you/i.test(summaryText) && !/software|tool|automation|platform|directory|comparison|calculator|dashboard|search/i.test(summaryText)) {
    score -= 8;
    penaltyNotes.push('too manual or service-heavy (-8)');
  }

  if (opportunityConfidence === 'high' && evidenceConfidence === 'high' && signalCount >= 2 && breakdown.distribution >= 7) {
    score += 4;
    bonusNotes.push('strong evidence + clear GTM (+4)');
  }

  return { finalScore: Math.max(0, Math.min(100, score)), penaltyNotes, bonusNotes };
}

// ── Notes builder ─────────────────────────────────────────────────────────────

function buildNotes(idea: any, breakdown: Record<string, number>, penalties: string[], bonuses: string[]): string {
  const parts: string[] = [];
  const signalCount = idea.signal_count ?? idea.signalCount ?? 1;
  const evidenceConfidence = idea.evidence_confidence ?? idea.evidenceConfidence ?? idea.confidence ?? 'low';
  const opportunityConfidence = idea.opportunity_confidence ?? idea.opportunityConfidence ?? idea.confidence ?? 'low';

  if (signalCount >= 2) parts.push(`${signalCount} signals`);
  if (opportunityConfidence === 'high') parts.push('high opportunity confidence');
  if (evidenceConfidence === 'high') parts.push('strong evidence');
  if (breakdown.founderFit >= 8) parts.push('strong founder fit');
  if (breakdown.painClarity >= 8) parts.push('clear pain');
  if (breakdown.mvpFeasibility >= 8) parts.push('simple V1');
  if (breakdown.monetization >= 8) parts.push('clear monetization');
  if (breakdown.distribution >= 8) parts.push('clear distribution');
  if (bonuses.length > 0) parts.push(...bonuses);
  if (penalties.length > 0) parts.push(...penalties);
  return parts.join(' | ');
}
