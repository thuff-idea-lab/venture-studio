import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from '../../lib/logger';
import { db } from '../../lib/db';
import { callLLM } from '../../lib/llm';
import * as fs from 'fs';
import * as path from 'path';

const AGENT = 'planner';

export async function runPlanner(): Promise<void> {
  logger.info(AGENT, 'Starting planner run');

  // Fetch BUILD-rated ideas that don't have a project yet
  const { data: evaluations, error } = await db
    .from('evaluations')
    .select('*, ideas(*)')
    .eq('recommendation', 'BUILD')
    .is('project_created_at', null)
    .limit(10);

  if (error) throw error;
  if (!evaluations || evaluations.length === 0) {
    logger.info(AGENT, 'No BUILD ideas waiting for plans');
    return;
  }

  logger.info(AGENT, `Planning ${evaluations.length} ideas`);

  for (const evaluation of evaluations) {
    const idea = (evaluation as any).ideas;
    const plan = await generatePlan(idea, evaluation);

    // Write to DB
    await db.from('projects').insert({
      idea_id: idea.id,
      slug: slugify(idea.title),
      project_type: plan.projectType,
      status: 'PLANNED',
      plan,
    });

    // Write project.json file
    const projectDir = path.join(process.cwd(), 'projects', 'active', slugify(idea.title));
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify(plan, null, 2));
    fs.writeFileSync(path.join(projectDir, 'notes.md'), `# ${idea.title}\n\n> ${idea.summary}\n`);

    // Mark evaluation as planned
    await db.from('evaluations').update({ project_created_at: new Date().toISOString() }).eq('id', evaluation.id);

    logger.info(AGENT, `Created project: ${slugify(idea.title)}`);
  }

  logger.info(AGENT, 'Planner complete');
}

async function generatePlan(idea: any, evaluation: any): Promise<Record<string, any>> {
  const prompt = `
You are a lean startup advisor. Generate a concise MVP project plan as valid JSON.

Idea: ${idea.title}
Summary: ${idea.summary}
Score: ${evaluation.score_total}/100
Asset type hint: ${idea.asset_type_hint}

Return ONLY valid JSON matching this structure:
{
  "slug": "kebab-case-slug",
  "projectType": "website|directory|saas|youtube|newsletter|bot|data",
  "oneSentencePitch": "...",
  "targetUser": "...",
  "primaryMonetization": ["ads|affiliate|leadgen|subscription|product|data"],
  "mvpDefinition": {
    "deliverables": ["..."],
    "timeboxHours": 6,
    "successMetric": "..."
  },
  "buildPlan": {
    "steps": ["..."],
    "tech": ["Next.js", "Tailwind", "Vercel"],
    "risks": ["..."],
    "constraints": ["Ship in 6 hours"]
  },
  "testPlan": {
    "channels": ["SEO", "INDIE_HACKERS"],
    "budget": 0,
    "goNoGo": ["50 email signups in 7 days"]
  }
}`;

  const response = await callLLM(prompt, { temperature: 0.2 });

  try {
    return JSON.parse(response);
  } catch {
    logger.warn(AGENT, 'Failed to parse LLM JSON, using fallback plan');
    return { slug: slugify(idea.title), projectType: idea.asset_type_hint ?? 'website', oneSentencePitch: idea.summary };
  }
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
