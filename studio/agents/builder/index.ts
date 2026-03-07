import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { db } from '../../lib/db';
import { logger } from '../../lib/logger';
import { validate } from '../../lib/validate';
import mvpSchema from '../../contracts/mvp.schema.json';
import { buildProjectFiles } from './templates';
import type { BuildArtifact, ProjectRow, ReviewContext } from './types';

const AGENT = 'builder';
const TEMPLATE_NAME = 'nextjs-studio-v1';
const DEFAULT_CONCURRENCY = 1;
const SUPPORTED_PROJECT_TYPES = new Set(['saas', 'directory', 'website']);

export async function runBuilder(): Promise<void> {
  logger.info(AGENT, 'Starting builder run');

  const manualSlug = process.env.BUILDER_PROJECT_SLUG?.trim();
  if (!manualSlug) {
    const activeBuilds = await getActiveBuildingCount();
    const concurrency = getBuilderConcurrency();
    if (activeBuilds >= concurrency) {
      logger.info(AGENT, `Builder concurrency limit reached (${activeBuilds}/${concurrency})`);
      return;
    }
  }

  const project = manualSlug ? await loadProjectBySlug(manualSlug) : await claimNextApprovedProject();
  if (!project) {
    logger.info(AGENT, manualSlug ? `No project found for BUILDER_PROJECT_SLUG=${manualSlug}` : 'No APPROVED projects waiting for build');
    return;
  }

  if (!SUPPORTED_PROJECT_TYPES.has(project.project_type)) {
    const errorMessage = `Unsupported project type for Builder v1: ${project.project_type}`;
    await markBuildPaused(project, errorMessage, 'Builder currently supports only saas, directory, and website projects.');
    throw new Error(errorMessage);
  }

  if (manualSlug && project.status !== 'BUILDING') {
    await db.from('projects').update({
      status: 'BUILDING',
      build_started_at: new Date().toISOString(),
      last_build_error: '',
    }).eq('id', project.id);
  }

  try {
    const context = await loadReviewContext(project.id);
    const buildRoot = path.join(process.cwd(), 'projects', 'active', project.slug, 'build');
    const files = buildProjectFiles(project.plan, context);

    fs.rmSync(buildRoot, { recursive: true, force: true });
    for (const [relativePath, content] of Object.entries(files)) {
      const absolutePath = path.join(buildRoot, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, content);
    }

    execSync('npm install', { cwd: buildRoot, stdio: 'pipe' });
    execSync('npm run build', { cwd: buildRoot, stdio: 'pipe' });

    const artifact = validate<BuildArtifact>(mvpSchema, {
      projectSlug: project.slug,
      projectType: project.project_type,
      status: 'PAUSED',
      template: TEMPLATE_NAME,
      generatedAppPath: path.relative(process.cwd(), buildRoot),
      artifacts: Object.keys(files),
      validation: {
        installCommand: 'npm install',
        buildCommand: 'npm run build',
        buildPassed: true,
        notes: [
          'Builder v1 generated a Next.js MVP scaffold.',
          'Build completed successfully and is ready for human review.',
        ],
      },
      generatedAt: new Date().toISOString(),
    });

    const mvpDir = path.join(process.cwd(), 'projects', 'active', project.slug, 'mvp');
    fs.mkdirSync(mvpDir, { recursive: true });
    fs.writeFileSync(path.join(mvpDir, 'mvp.json'), JSON.stringify(artifact, null, 2));
    fs.writeFileSync(path.join(mvpDir, 'builder-report.md'), buildBuilderReport(project, context, artifact));

    await db.from('projects').update({
      status: 'PAUSED',
      build_finished_at: new Date().toISOString(),
      last_build_error: '',
      decision_notes: appendDecisionNote(project.decision_notes, 'Builder generated an MVP scaffold and passed production build. Review before promotion.'),
    }).eq('id', project.id);

    logger.info(AGENT, `Builder complete for ${project.slug}`);
  } catch (error: any) {
    const message = error?.stderr?.toString?.() || error?.message || String(error);
    await markBuildPaused(project, message, 'Builder failed while generating or validating the MVP scaffold.');
    throw error;
  }
}

async function getActiveBuildingCount(): Promise<number> {
  const { count, error } = await db.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'BUILDING');
  if (error) throw error;
  return count ?? 0;
}

function getBuilderConcurrency(): number {
  const rawValue = Number(process.env.BUILDER_CONCURRENCY ?? DEFAULT_CONCURRENCY);
  if (!Number.isFinite(rawValue) || rawValue < 1) return DEFAULT_CONCURRENCY;
  return Math.floor(rawValue);
}

async function loadProjectBySlug(slug: string): Promise<ProjectRow | null> {
  const { data, error } = await db
    .from('projects')
    .select('id, idea_id, slug, project_type, status, priority, decision_notes, plan')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data as ProjectRow | null;
}

async function claimNextApprovedProject(): Promise<ProjectRow | null> {
  const { data, error } = await db
    .from('projects')
    .select('id, idea_id, slug, project_type, status, priority, decision_notes, plan')
    .eq('status', 'APPROVED')
    .order('priority', { ascending: true })
    .order('approved_at', { ascending: true })
    .limit(5);
  if (error) throw error;

  for (const candidate of (data ?? []) as ProjectRow[]) {
    const { data: updated, error: updateError } = await db
      .from('projects')
      .update({
        status: 'BUILDING',
        build_started_at: new Date().toISOString(),
        last_build_error: '',
      })
      .eq('id', candidate.id)
      .eq('status', 'APPROVED')
      .select('id, idea_id, slug, project_type, status, priority, decision_notes, plan')
      .maybeSingle();
    if (updateError) throw updateError;
    if (updated) return updated as ProjectRow;
  }

  return null;
}

async function loadReviewContext(projectId: string): Promise<ReviewContext> {
  const { data, error } = await db
    .from('project_review_queue')
    .select('idea_title, idea_summary, idea_audience, idea_pain, idea_workaround, idea_frequency, evaluation_notes, evaluation_score_total, idea_sources')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Review context missing for project ${projectId}`);
  return data as ReviewContext;
}

async function markBuildPaused(project: ProjectRow, errorMessage: string, note: string): Promise<void> {
  await db.from('projects').update({
    status: 'PAUSED',
    build_finished_at: new Date().toISOString(),
    last_build_error: truncate(errorMessage, 4000),
    decision_notes: appendDecisionNote(project.decision_notes, note),
  }).eq('id', project.id);
}

function appendDecisionNote(existing: string, note: string): string {
  const trimmed = existing.trim();
  return trimmed ? `${trimmed}\n\n${note}` : note;
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function buildBuilderReport(project: ProjectRow, context: ReviewContext, artifact: BuildArtifact): string {
  return `# Builder Report

## Project
- Slug: ${project.slug}
- Type: ${project.project_type}
- Status after build: ${artifact.status}

## Context
- Idea: ${context.idea_title}
- Summary: ${context.idea_summary}
- Evaluation score: ${context.evaluation_score_total ?? 'n/a'}
- Evaluation notes: ${context.evaluation_notes ?? 'n/a'}

## Generated output
- Template: ${artifact.template}
- Build path: ${artifact.generatedAppPath}
- Build passed: ${artifact.validation.buildPassed ? 'yes' : 'no'}

## Artifacts
${artifact.artifacts.map((item) => `- ${item}`).join('\n')}
`;
}