// ── Planner V4 Orchestrator ───────────────────────────────────────────────────
// Reads BUILD ideas from evaluations_v4, generates 5 markdown files per idea,
// writes them to projects-v4/{slug}/, and stamps planned_at on the evaluation.

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../../lib/db';
import { logger } from '../../lib/logger';
import { generateBrief } from './brief';
import { generateSpec } from './spec';
import { generateDesign } from './design';
import { generateDistribution } from './distribution';
import { generateQuestions } from './questions';
import type { IdeasV4Row, EvaluationV4Row, PlannerInput } from './types';

const AGENT = 'planner-v4';
const BATCH_LIMIT = 10;

export async function runPlannerV4(): Promise<void> {
  logger.info(AGENT, 'Starting planner v4 run');
  const startTime = Date.now();

  // 1. Fetch BUILD evaluations that haven't been planned yet
  const { data: evaluations, error: fetchError } = await db
    .from('evaluations_v4')
    .select('*, ideas_v4(*)')
    .eq('recommendation', 'BUILD')
    .is('planned_at', null)
    .order('score_final', { ascending: false })
    .limit(BATCH_LIMIT);

  if (fetchError) {
    logger.error(AGENT, `Failed to fetch evaluations: ${fetchError.message}`);
    return;
  }

  if (!evaluations || evaluations.length === 0) {
    logger.info(AGENT, 'No BUILD ideas waiting for plans');
    return;
  }

  logger.info(AGENT, `Planning ${evaluations.length} BUILD ideas`);

  let planned = 0;
  let failed = 0;

  for (const row of evaluations) {
    const idea = row.ideas_v4 as IdeasV4Row;
    const evaluation: EvaluationV4Row = {
      id: row.id,
      idea_id: row.idea_id,
      score_problem_clarity: row.score_problem_clarity,
      score_target_user: row.score_target_user,
      score_build_feasibility: row.score_build_feasibility,
      score_revenue_path: row.score_revenue_path,
      score_distribution: row.score_distribution,
      score_timing: row.score_timing,
      score_raw: row.score_raw,
      score_final: row.score_final,
      validation_modifier: row.validation_modifier,
      recommendation: row.recommendation,
      reasoning: row.reasoning,
      strengths: row.strengths,
      risks: row.risks,
      created_at: row.created_at,
    };

    const slug = slugify(idea.title);
    const input: PlannerInput = { idea, evaluation, slug };

    logger.info(AGENT, `Planning [${planned + 1}/${evaluations.length}]: ${idea.title}`);

    try {
      // Generate all 5 documents
      const brief = generateBrief(input);
      logger.info(AGENT, `  BRIEF.md generated (no LLM)`);

      const spec = await generateSpec(input);
      logger.info(AGENT, `  SPEC.md generated`);

      const design = await generateDesign(input);
      logger.info(AGENT, `  DESIGN.md generated`);

      const dist = await generateDistribution(input);
      logger.info(AGENT, `  DISTRIBUTION.md generated`);

      const questions = await generateQuestions(input);
      logger.info(AGENT, `  QUESTIONS.md generated`);

      // Write files to projects-v4/{slug}/
      const projectDir = path.join(process.cwd(), 'projects-v4', slug);
      fs.mkdirSync(projectDir, { recursive: true });

      fs.writeFileSync(path.join(projectDir, 'BRIEF.md'), brief, 'utf-8');
      fs.writeFileSync(path.join(projectDir, 'SPEC.md'), spec, 'utf-8');
      fs.writeFileSync(path.join(projectDir, 'DESIGN.md'), design, 'utf-8');
      fs.writeFileSync(path.join(projectDir, 'DISTRIBUTION.md'), dist, 'utf-8');
      fs.writeFileSync(path.join(projectDir, 'QUESTIONS.md'), questions, 'utf-8');

      // Stamp planned_at on the evaluation
      const { error: updateError } = await db
        .from('evaluations_v4')
        .update({ planned_at: new Date().toISOString() })
        .eq('id', evaluation.id);

      if (updateError) {
        logger.warn(AGENT, `Failed to stamp planned_at for "${idea.title}": ${updateError.message}`);
      }

      planned++;
      logger.info(AGENT, `  Written to projects-v4/${slug}/`);
    } catch (err: any) {
      failed++;
      logger.error(AGENT, `Failed to plan "${idea.title}": ${err?.message ?? err}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info(AGENT, `Planner v4 complete in ${elapsed}s`, {
    planned,
    failed,
    total: evaluations.length,
  });
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
