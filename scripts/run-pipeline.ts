import * as dotenv from 'dotenv';
dotenv.config();

import { runScout } from '../studio/agents/scout';
import { runEvaluator } from '../studio/agents/evaluator';
import { runPlanner } from '../studio/agents/planner';
import { db } from '../studio/lib/db';
import { logger } from '../studio/lib/logger';

const AGENT = 'pipeline';

async function main() {
  logger.info(AGENT, '=== Nightly pipeline starting ===');

  try {
    logger.info(AGENT, 'Step 1/3 — Scout');
    await runScout();

    logger.info(AGENT, 'Step 2/3 — Evaluator');
    await runEvaluator();

    logger.info(AGENT, 'Step 3/3 — Planner');
    await runPlanner();

    const [ideasCount, evaluationsCount, projectsCount] = await Promise.all([
      getTableCount('ideas'),
      getTableCount('evaluations'),
      getTableCount('projects'),
    ]);

    logger.info(AGENT, 'Pipeline row counts', {
      ideas: ideasCount,
      evaluations: evaluationsCount,
      projects: projectsCount,
    });

    logger.info(AGENT, '=== Pipeline complete ===');
  } catch (err) {
    logger.error(AGENT, 'Pipeline failed', err);
    process.exit(1);
  }
}

async function getTableCount(table: 'ideas' | 'evaluations' | 'projects'): Promise<number> {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

main();
