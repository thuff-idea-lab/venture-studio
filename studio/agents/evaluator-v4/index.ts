import { db } from '../../lib/db';
import { logger } from '../../lib/logger';
import { evaluateWithLLM } from './evaluate';
import { buildEvaluationResult, WEIGHTS } from './scoring';
import type { IdeasV4Row, EvaluationResult } from './types';

const BATCH_LIMIT = 50;

/**
 * Main orchestrator for Evaluator V4.
 * Reads unevaluated ideas from ideas_v4, scores via LLM + validation modifiers,
 * writes results to evaluations_v4.
 */
export async function runEvaluatorV4(): Promise<void> {
  logger.info('evaluator-v4', 'Starting evaluator v4 run');
  const startTime = Date.now();

  // 1. Fetch unevaluated ideas from ideas_v4
  const { data: ideas, error: fetchError } = await db
    .from('ideas_v4')
    .select('*')
    .is('evaluated_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (fetchError) {
    logger.error('evaluator-v4', `Failed to fetch ideas: ${fetchError.message}`);
    return;
  }

  if (!ideas || ideas.length === 0) {
    logger.info('evaluator-v4', 'No unevaluated ideas found');
    return;
  }

  logger.info('evaluator-v4', `Found ${ideas.length} unevaluated ideas`);

  // 2. Evaluate each idea
  const results: EvaluationResult[] = [];
  let evaluated = 0;
  let failed = 0;

  for (const idea of ideas as IdeasV4Row[]) {
    logger.info('evaluator-v4', `Evaluating [${evaluated + 1}/${ideas.length}]: ${idea.title}`);

    // LLM evaluation
    const llmEval = await evaluateWithLLM(idea);
    if (!llmEval) {
      failed++;
      logger.warn('evaluator-v4', `Skipping "${idea.title}" — LLM evaluation failed`);
      continue;
    }

    // Build final result with validation modifiers + hard gates
    const validation = idea.validation_data ?? {};
    const result = buildEvaluationResult(idea.id, llmEval, validation, WEIGHTS, idea.title);
    results.push(result);

    logger.info('evaluator-v4', `${result.recommendation} (${result.score_final}) — ${idea.title}`, {
      raw: result.score_raw,
      modifier: result.validation_modifier,
      final: result.score_final,
    });

    // 3. Write evaluation to DB
    const { error: insertError } = await db.from('evaluations_v4').insert({
      idea_id: result.idea_id,
      score_problem_clarity: result.scores.problem_clarity,
      score_target_user: result.scores.target_user,
      score_build_feasibility: result.scores.build_feasibility,
      score_revenue_path: result.scores.revenue_path,
      score_distribution: result.scores.distribution,
      score_timing: result.scores.timing,
      score_raw: result.score_raw,
      score_final: result.score_final,
      validation_modifier: result.validation_modifier,
      recommendation: result.recommendation,
      reasoning: result.reasoning,
      strengths: result.strengths,
      risks: result.risks,
    });

    if (insertError) {
      logger.error('evaluator-v4', `DB insert failed for "${idea.title}": ${insertError.message}`);
      failed++;
      continue;
    }

    // 4. Stamp evaluated_at on the idea
    const { error: updateError } = await db
      .from('ideas_v4')
      .update({ evaluated_at: new Date().toISOString() })
      .eq('id', idea.id);

    if (updateError) {
      logger.warn('evaluator-v4', `Failed to stamp evaluated_at for "${idea.title}": ${updateError.message}`);
    }

    evaluated++;
  }

  // 5. Summary
  const builds = results.filter(r => r.recommendation === 'BUILD').length;
  const watches = results.filter(r => r.recommendation === 'WATCH').length;
  const drops = results.filter(r => r.recommendation === 'DROP').length;
  const avgScore = results.length > 0
    ? (results.reduce((sum, r) => sum + r.score_final, 0) / results.length).toFixed(1)
    : '0';

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info('evaluator-v4', `Evaluator v4 complete in ${elapsed}s`, {
    evaluated,
    failed,
    builds,
    watches,
    drops,
    avgScore,
  });
}
