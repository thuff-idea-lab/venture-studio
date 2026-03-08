import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from '../studio/lib/logger';

const AGENT = 'run-agent';
const agentName = process.argv[2];

async function main() {
  if (!agentName) {
    console.error('Usage: ts-node scripts/run-agent.ts <scout|scout-v4|evaluator|planner|builder>');
    process.exit(1);
  }

  logger.info(AGENT, `Running agent: ${agentName}`);

  try {
    switch (agentName) {
      case 'scout': {
        const { runScout } = await import('../studio/agents/scout');
        await runScout();
        break;
      }
      case 'scout-v4': {
        const { runScoutV4 } = await import('../studio/agents/scout-v4');
        await runScoutV4();
        break;
      }
      case 'evaluator': {
        const { runEvaluator } = await import('../studio/agents/evaluator');
        await runEvaluator();
        break;
      }
      case 'planner': {
        const { runPlanner } = await import('../studio/agents/planner');
        await runPlanner();
        break;
      }
      case 'builder': {
        const { runBuilder } = await import('../studio/agents/builder');
        await runBuilder();
        break;
      }
      default:
        throw new Error(`Unknown agent: ${agentName}`);
    }
  } catch (err) {
    logger.error(AGENT, `Agent ${agentName} failed`, err);
    process.exit(1);
  }
}

main();
