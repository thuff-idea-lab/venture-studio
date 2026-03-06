import * as dotenv from 'dotenv';
dotenv.config();

import { runScout } from '../studio/agents/scout';
import { runEvaluator } from '../studio/agents/evaluator';
import { runPlanner } from '../studio/agents/planner';
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

    logger.info(AGENT, '=== Pipeline complete ===');
  } catch (err) {
    logger.error(AGENT, 'Pipeline failed', err);
    process.exit(1);
  }
}

main();
