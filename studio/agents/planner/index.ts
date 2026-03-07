import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from '../../lib/logger';
import { db } from '../../lib/db';
import { callLLM } from '../../lib/llm';
import { validate } from '../../lib/validate';
import projectSchema from '../../contracts/project.schema.json';
import * as fs from 'fs';
import * as path from 'path';

const AGENT = 'planner';
const DEFAULT_PLANNER_BATCH_LIMIT = 25;

export async function runPlanner(): Promise<void> {
  logger.info(AGENT, 'Starting planner run');
  const plannerBatchLimit = getPlannerBatchLimit();

  // Fetch BUILD-rated ideas that don't have a project yet
  const { data: evaluations, error } = await db
    .from('evaluations')
    .select('*, ideas(*)')
    .eq('recommendation', 'BUILD')
    .is('project_created_at', null)
    .limit(plannerBatchLimit);

  if (error) throw error;
  if (!evaluations || evaluations.length === 0) {
    logger.info(AGENT, 'No BUILD ideas waiting for plans');
    return;
  }

  logger.info(AGENT, `Planning ${evaluations.length} ideas`);

  for (const evaluation of evaluations) {
    const idea = (evaluation as any).ideas;
    const plan = await generatePlan(idea, evaluation);
    const projectSlug = slugify(idea.title);

    // Write to DB
    await db.from('projects').insert({
      idea_id: idea.id,
      slug: projectSlug,
      project_type: plan.projectType,
      status: 'PLANNED',
      plan,
    });

    // Write project.json file
    const projectDir = path.join(process.cwd(), 'projects', 'active', projectSlug);
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify(plan, null, 2));
    fs.writeFileSync(path.join(projectDir, 'notes.md'), buildProjectNotes(idea, evaluation, plan));

    // Mark evaluation as planned
    await db.from('evaluations').update({ project_created_at: new Date().toISOString() }).eq('id', evaluation.id);

    logger.info(AGENT, `Created project: ${projectSlug}`);
  }

  logger.info(AGENT, 'Planner complete');
}

function getPlannerBatchLimit(): number {
  const rawValue = process.env.PLANNER_BATCH_LIMIT;
  if (!rawValue) return DEFAULT_PLANNER_BATCH_LIMIT;

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn(AGENT, `Invalid PLANNER_BATCH_LIMIT value "${rawValue}". Falling back to ${DEFAULT_PLANNER_BATCH_LIMIT}.`);
    return DEFAULT_PLANNER_BATCH_LIMIT;
  }

  return Math.floor(parsed);
}

async function generatePlan(idea: any, evaluation: any): Promise<Record<string, any>> {
  const projectSlug = slugify(idea.title);
  const planningBrief = buildPlanningBrief(idea, evaluation);
  const prompt = `
You are a lean startup advisor writing plans for an automated venture studio.

Your job is to produce a builder-ready MVP plan for a small, fast, low-ops internet business.

PLANNING RULES:
- prefer plans that can be scaffolded and built quickly with reusable patterns
- bias toward base hits: simple implementation, clear validation path, low ongoing operations
- allow bigger ideas only if the path is still concrete and the first release stays narrow
- do not write vague strategy documents; write execution-ready plans
- avoid hidden complexity, broad marketplaces, or heavy manual services
- make the first version extremely constrained and easy to test
- every field must help a builder ship the first version without inventing missing requirements
- prefer domain-specific workflows over generic SaaS boilerplate
- do not include authentication, teams, dashboards, or onboarding unless they are required for the core workflow
- do not use placeholder validation goals like "10 active users" or "50 signups" unless they are clearly tied to the idea's acquisition path
- do not suggest hardcoded seed data when the idea depends on a real source dataset; name the likely source instead
- build steps must describe the product workflow, not just framework setup
- if the idea is broad, category-shaped, or sounds like generic SaaS, narrow it to the smallest credible wedge with the clearest user, clearest trigger, and easiest validation path
- the plan should help a human approver understand why this wedge is the right first version and help a Builder agent implement it without inventing requirements
- prefer specific acquisition paths over generic channels like "SEO" or "social media"

Idea: ${idea.title}
Summary: ${idea.summary}
Audience: ${idea.audience ?? ''}
Pain: ${idea.pain ?? ''}
Current workaround: ${idea.workaround ?? ''}
Frequency: ${idea.frequency ?? 'unknown'}
Why now: ${idea.why_now ?? ''}
Source excerpt: ${idea.source_excerpt ?? ''}
Monetization paths: ${JSON.stringify(idea.monetization ?? [])}
Distribution paths: ${JSON.stringify(idea.distribution_paths ?? [])}
Product possibilities: ${JSON.stringify(idea.product_possibilities ?? [])}
Founder fit reasons: ${JSON.stringify(idea.founder_fit_reason ?? [])}
Score: ${evaluation.score_total}/100
Evaluation notes: ${evaluation.notes ?? ''}
Asset type hint: ${idea.asset_type_hint}

Planning brief:
${planningBrief}

Return ONLY valid JSON matching this structure:
{
  "slug": "${projectSlug}",
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
  "executionContext": {
    "trigger": "what event causes the user to need this",
    "coreInputs": ["data or content needed to make the product work"],
    "coreOutputs": ["what the product produces for the user"],
    "mustHaveV1Features": ["smallest non-negotiable features"],
    "outOfScopeForV1": ["things explicitly excluded from the first version"],
    "suggestedIntegrations": ["optional integrations or data sources"],
    "operationalNotes": ["notes that help a future builder or operator keep this lightweight"]
  },
  "testPlan": {
    "channels": ["high-intent search queries", "specific subreddit or niche community", "targeted cold outreach if relevant"],
    "budget": 0,
    "tracking": ["what to measure in the first validation pass"],
    "goNoGo": ["50 email signups in 7 days"]
  }
}

The plan should be specific enough that a future Builder agent can implement the MVP without inventing missing requirements.`;

  const response = await callLLM(prompt, { temperature: 0.2 });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in planner response');

    const parsed = JSON.parse(jsonMatch[0]);
    return normalizePlan(parsed, idea, evaluation);
  } catch (error: any) {
    logger.warn(AGENT, `Failed to parse or validate planner JSON, using fallback plan: ${error?.message ?? error}`);
    return buildFallbackPlan(idea, evaluation);
  }
}

function normalizePlan(plan: Record<string, any>, idea: any, evaluation: any): Record<string, any> {
  const projectType = normalizeProjectType(plan.projectType, idea.asset_type_hint, idea.title, idea.summary);
  return validate<Record<string, any>>(projectSchema, {
    slug: slugify(plan.slug ?? idea.title),
    projectType,
    oneSentencePitch: String(plan.oneSentencePitch ?? idea.summary ?? idea.title),
    targetUser: String(plan.targetUser ?? idea.audience ?? 'niche internet operator'),
    primaryMonetization: normalizeMonetization(plan.primaryMonetization, idea.monetization),
    mvpDefinition: {
      deliverables: sanitizeDeliverables(plan.mvpDefinition?.deliverables, idea, projectType),
      timeboxHours: normalizeTimebox(plan.mvpDefinition?.timeboxHours),
      successMetric: sanitizeSuccessMetric(plan.mvpDefinition?.successMetric, idea, projectType),
    },
    buildPlan: {
      steps: sanitizeBuildSteps(plan.buildPlan?.steps, idea, projectType),
      tech: sanitizeTechStack(plan.buildPlan?.tech, idea, projectType),
      risks: sanitizeRisks(plan.buildPlan?.risks, idea),
      constraints: normalizeStringArray(plan.buildPlan?.constraints, 5, ['Ship a narrow V1', 'Avoid manual service work', 'Prefer reusable components']),
    },
    executionContext: {
      trigger: String(plan.executionContext?.trigger ?? defaultTrigger(idea)),
      coreInputs: normalizeStringArray(plan.executionContext?.coreInputs, 5, defaultCoreInputs(idea)),
      coreOutputs: normalizeStringArray(plan.executionContext?.coreOutputs, 5, defaultCoreOutputs(idea)),
      mustHaveV1Features: sanitizeFeatures(plan.executionContext?.mustHaveV1Features, idea, projectType),
      outOfScopeForV1: normalizeStringArray(plan.executionContext?.outOfScopeForV1, 5, ['Complex multi-user collaboration', 'Enterprise admin controls', 'Custom service work']),
      suggestedIntegrations: normalizeStringArray(plan.executionContext?.suggestedIntegrations, 5, defaultSuggestedIntegrations(idea)),
      operationalNotes: sanitizeOperationalNotes(plan.executionContext?.operationalNotes, idea, evaluation),
    },
    testPlan: {
      channels: normalizeChannels(plan.testPlan?.channels, idea.distribution_paths),
      budget: normalizeBudget(plan.testPlan?.budget),
      tracking: sanitizeTrackingMetrics(plan.testPlan?.tracking, idea, projectType),
      goNoGo: sanitizeGoNoGoCriteria(plan.testPlan?.goNoGo, idea, projectType),
    },
  });
}

function buildFallbackPlan(idea: any, evaluation: any): Record<string, any> {
  return validate<Record<string, any>>(projectSchema, {
    slug: slugify(idea.title),
    projectType: normalizeProjectType(idea.asset_type_hint, idea.asset_type_hint, idea.title, idea.summary),
    oneSentencePitch: idea.summary ?? idea.title,
    targetUser: idea.audience ?? 'niche internet operator',
    primaryMonetization: normalizeMonetization([], idea.monetization),
    mvpDefinition: {
      deliverables: ['Narrow landing page', 'Core workflow implementation', 'Basic usage tracking'],
      timeboxHours: 8,
      successMetric: defaultSuccessMetric(idea),
    },
    buildPlan: {
      steps: defaultBuildSteps(idea),
      tech: defaultTechStack(idea),
      risks: defaultRisks(idea),
      constraints: ['Ship a narrow V1', 'Avoid bespoke service delivery', 'Use reusable patterns and hosted services'],
    },
    executionContext: {
      trigger: defaultTrigger(idea),
      coreInputs: defaultCoreInputs(idea),
      coreOutputs: defaultCoreOutputs(idea),
      mustHaveV1Features: defaultMustHaveFeatures(idea),
      outOfScopeForV1: ['Advanced automation', 'Enterprise roles and permissions', 'Manual service fulfillment'],
      suggestedIntegrations: defaultSuggestedIntegrations(idea),
      operationalNotes: defaultOperationalNotes(idea, evaluation),
    },
    testPlan: {
      channels: normalizeChannels([], idea.distribution_paths),
      budget: 0,
      tracking: defaultTrackingMetrics(idea),
      goNoGo: defaultGoNoGoCriteria(idea),
    },
  });
}

function normalizeProjectType(rawValue: unknown, assetTypeHint: unknown, title: string, summary: string): string {
  const text = `${String(rawValue ?? '')} ${String(assetTypeHint ?? '')} ${title} ${summary}`.toLowerCase();
  if (/directory|finder|lookup|registry|listing/.test(text)) return 'directory';
  if (/calculator|estimator|pricing|quote|roi|cost/.test(text)) return 'website';
  if (/comparison|compare|vs\b|alternative|best for|decision/.test(text)) return 'website';
  if (/newsletter/.test(text)) return 'newsletter';
  if (/youtube|video channel/.test(text)) return 'youtube';
  if (/bot/.test(text)) return 'bot';
  if (/data/.test(text)) return 'data';
  if (/website|content site|seo|affiliate|research|guide/.test(text)) return 'website';
  if (/scheduler|booking|appointment|automation|workflow|report|generator|optimizer|optimization|tool/.test(text)) return 'saas';
  return 'saas';
}

function normalizeMonetization(primary: unknown, fallback: unknown): string[] {
  const values = [...normalizeStringArray(primary, 3, []), ...normalizeStringArray(fallback, 3, [])].map(value => value.toLowerCase());
  const normalized = values.map(value => {
    if (/sub|recurr|saas/.test(value)) return 'subscription';
    if (/affiliate/.test(value)) return 'affiliate';
    if (/lead/.test(value)) return 'leadgen';
    if (/data/.test(value)) return 'data';
    if (/product|download|template|course/.test(value)) return 'product';
    if (/ads|advert/.test(value)) return 'ads';
    return null;
  }).filter((value): value is NonNullable<typeof value> => value !== null);

  const deduped = [...new Set(normalized)].slice(0, 3);
  return deduped.length > 0 ? deduped : ['subscription'];
}

function normalizeChannels(primary: unknown, distributionPaths: unknown): string[] {
  const values = [...normalizeStringArray(primary, 4, []), ...normalizeStringArray(distributionPaths, 4, [])].map(value => value.toUpperCase());
  const normalized = values.map(value => {
    if (/SEO|SEARCH/.test(value)) return 'SEO';
    if (/REDDIT|COMMUNITY|FORUM/.test(value)) return 'REDDIT';
    if (/EMAIL|NEWSLETTER/.test(value)) return 'EMAIL';
    if (/X|TWITTER|SOCIAL/.test(value)) return 'X';
    if (/ADS|PAID/.test(value)) return 'ADS';
    return null;
  }).filter((value): value is NonNullable<typeof value> => value !== null);

  const deduped = [...new Set(normalized)].slice(0, 3);
  return deduped.length > 0 ? deduped : ['SEO', 'REDDIT'];
}

function normalizeStringArray(value: unknown, maxItems: number, fallback: string[]): string[] {
  const source = Array.isArray(value) ? value : [];
  const normalized = source.map(item => String(item ?? '').trim()).filter(Boolean).slice(0, maxItems);
  return normalized.length > 0 ? normalized : fallback.slice(0, maxItems);
}

function normalizeTimebox(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 8;
  return Math.max(4, Math.min(20, Math.round(parsed)));
}

function normalizeBudget(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(250, Math.round(parsed));
}

function defaultSuccessMetric(idea: any): string {
  const text = `${idea.title ?? ''} ${idea.summary ?? ''}`.toLowerCase();
  const monetization = JSON.stringify(idea.monetization ?? []).toLowerCase();
  if (/directory|comparison|search|lookup|finder|provider/.test(text)) return 'At least 10 target users run a search and 3 click through to a provider or listing detail within 14 days';
  if (/automation|workflow|processing|parser|extract|scheduler|booking/.test(text)) return 'At least 3 target users complete the full workflow with real input data within 14 days';
  if (/calculator|estimator|quote|pricing/.test(text)) return 'At least 10 target users complete a quote or estimate flow and 3 request follow-up within 14 days';
  if (/subscription|saas|recurring/.test(monetization)) return '3 users complete the core workflow or start a trial in 14 days';
  if (/affiliate|leadgen/.test(monetization)) return '20 qualified visitor actions or leads within 14 days';
  return 'Clear evidence that users complete the primary workflow within 14 days';
}

function defaultBuildSteps(idea: any): string[] {
  const archetype = inferArchetype(idea);
  if (archetype === 'directory') {
    return [
      `Import one real source dataset for ${idea.title} and normalize it into a minimal searchable schema`,
      'Build a search and filter flow around the main decision criteria users already care about',
      'Create a detail page with the fields needed to compare or contact the listing',
      'Add one opinionated comparison or shortlist action that helps the user decide faster',
      'Publish a landing page with one CTA and track searches, detail views, and outbound clicks',
    ];
  }
  if (archetype === 'automation') {
    return [
      `Define the exact input format and output required for ${idea.title}`,
      'Build the upload or paste flow for one supported input type only',
      'Implement the transformation step that converts raw input into a usable result',
      'Add a review screen so users can verify the output before exporting or sending it onward',
      'Track completed runs, export actions, and failure reasons on a simple landing page',
    ];
  }
  if (archetype === 'calculator') {
    return [
      `Define the smallest pricing or estimate model that makes ${idea.title} useful`,
      'Build a single-page input form with only the required decision variables',
      'Generate an instant estimate with a transparent breakdown the user can trust',
      'Add a CTA to save, email, or request follow-up on the result',
      'Track estimate completions and follow-up requests from the landing page',
    ];
  }
  if (archetype === 'scheduler') {
    const text = `${idea.title ?? ''} ${idea.summary ?? ''}`.toLowerCase();
    if (/route|dispatch|jobber/.test(text)) {
      return [
        `Define the exact route-planning input for ${idea.title}, including stops, service windows, and starting location`,
        'Build the route input flow for one operator managing one day of jobs',
        'Implement route optimization and return an ordered stop list with travel time estimates',
        'Add a route review screen with manual reorder and export or copy actions',
        'Track route plans created, routes accepted, and exports or copies completed',
      ];
    }
    return [
      `Define one booking flow for ${idea.title} with a narrow set of appointment rules`,
      'Build availability capture for one business and one appointment type',
      'Create the customer booking request flow with confirmation messaging',
      'Add a simple operator view to review or confirm upcoming bookings',
      'Track booking starts, completed requests, and no-response drop-off',
    ];
  }
  return [
    `Define the narrow workflow for ${idea.title}`,
    'Design one primary user flow and one supporting admin flow',
    'Implement the core input-to-output workflow with minimal state',
    'Add basic tracking for activation and usage',
    'Publish a simple landing page with one CTA',
  ];
}

function defaultTechStack(idea: any): string[] {
  const assetType = `${String(idea.asset_type_hint ?? '')} ${idea.title ?? ''} ${idea.summary ?? ''}`.toLowerCase();
  if (/directory|comparison|website|search|lookup|finder/.test(assetType)) return ['Next.js', 'Tailwind', 'Supabase', 'Vercel'];
  if (/automation|workflow|processing|parser|extract/.test(assetType)) return ['Next.js', 'Tailwind', 'Supabase', 'pdf-parse or similar parser', 'Vercel'];
  return ['Next.js', 'Tailwind', 'Supabase', 'Vercel', 'Resend'];
}

function defaultRisks(idea: any): string[] {
  const text = `${idea.title ?? ''} ${idea.summary ?? ''}`.toLowerCase();
  const risks = ['The first version may be too broad if the workflow is not tightly scoped'];
  if (/directory|comparison|search|lookup/.test(text)) risks.push('Data freshness and source coverage may be weaker than expected');
  if (/automation|workflow|scheduler|generator/.test(text)) risks.push('The workflow may require more edge-case handling than the initial spec assumes');
  return risks.slice(0, 4);
}

function defaultTrigger(idea: any): string {
  const frequency = String(idea.frequency ?? 'unknown');
  return `User hits the recurring pain described in the idea (${frequency}) and needs a faster path than the current workaround.`;
}

function defaultCoreInputs(idea: any): string[] {
  const text = `${idea.title ?? ''} ${idea.summary ?? ''}`.toLowerCase();
  if (/directory|comparison|search|lookup|provider/.test(text)) return ['User search criteria', 'Source dataset or listing records'];
  if (/content|listing|video|blog|generator/.test(text)) return ['User source content or product details', 'Basic publishing preferences'];
  return ['User-provided form input', 'Minimal account or configuration data'];
}

function defaultCoreOutputs(idea: any): string[] {
  const text = `${idea.title ?? ''} ${idea.summary ?? ''}`.toLowerCase();
  if (/directory|comparison|search|lookup|provider/.test(text)) return ['Ranked results', 'Decision-friendly comparison or listing output'];
  if (/content|listing|video|blog|generator/.test(text)) return ['Ready-to-use content output', 'Editable draft for final review'];
  return ['Completed workflow output', 'Simple record or report showing the result'];
}

function defaultMustHaveFeatures(idea: any): string[] {
  const archetype = inferArchetype(idea);
  if (archetype === 'directory') return ['Search by the primary decision field', 'Detail pages from a real source dataset', 'Shortlist or outbound click tracking', 'Admin import for dataset refresh'];
  if (archetype === 'automation') return ['Single input method for real user files or text', 'One reliable transformation workflow', 'Review step before export', 'Export or copy result'];
  if (archetype === 'calculator') return ['Minimal quote input form', 'Transparent estimate output', 'Save or share result CTA', 'Basic conversion tracking'];
  if (archetype === 'scheduler') {
    const text = `${idea.title ?? ''} ${idea.summary ?? ''}`.toLowerCase();
    if (/route|dispatch|jobber/.test(text)) return ['Route input for one day of jobs', 'Optimized stop ordering with travel estimates', 'Manual review or reorder before export', 'Copy or export route plan'];
    return ['Availability rules for one appointment type', 'Customer booking request flow', 'Operator confirmation view', 'Notification or confirmation message'];
  }
  return ['Single clear primary workflow', 'Minimal onboarding or configuration', 'Saved output or history for the user', 'Basic analytics or event tracking'];
}

function defaultSuggestedIntegrations(idea: any): string[] {
  const text = `${idea.title ?? ''} ${idea.summary ?? ''}`.toLowerCase();
  const integrations: string[] = [];
  if (/video|blog|content|listing/.test(text)) integrations.push('OpenAI or similar generation API');
  if (/booking|scheduler|calendar/.test(text)) integrations.push('Google Calendar');
  if (/directory|comparison|lookup|provider/.test(text)) integrations.push('Public dataset or CSV import');
  if (/pdf|extract|processing|order/.test(text)) integrations.push('pdf-parse or OCR service for extraction');
  return integrations.length > 0 ? integrations : ['Email capture provider'];
}

function defaultEffortEstimate(idea: any, projectType: string): Record<string, any> {
  const text = `${idea.title ?? ''} ${idea.summary ?? ''} ${idea.pain ?? ''} ${idea.workaround ?? ''}`.toLowerCase();

  let size: 'XS' | 'S' | 'M' | 'L' = 'S';
  let estimatedBuilderHours = 8;
  let buildConfidence: 'high' | 'medium' | 'low' = 'medium';
  const effortReasons: string[] = [];
  const complexityRisks: string[] = [];

  if (/calculator|estimator|comparison|quiz|checklist|diagnostic|finder/.test(text) || projectType === 'website') {
    size = 'XS';
    estimatedBuilderHours = 6;
    buildConfidence = 'high';
    effortReasons.push('Single narrow workflow with a clear input-to-output path');
  }

  if (/directory|lookup|registry|listing|search/.test(text) || projectType === 'directory') {
    size = 'S';
    estimatedBuilderHours = 8;
    buildConfidence = 'medium';
    effortReasons.push('Search/filter UX is straightforward if the source data is clean');
    complexityRisks.push('Real dataset may require normalization or cleanup');
  }

  if (/automation|workflow|scheduler|booking|report|generator|optimizer/.test(text) || projectType === 'saas') {
    size = 'M';
    estimatedBuilderHours = 12;
    buildConfidence = 'medium';
    effortReasons.push('Workflow apps can appear simple but often hide edge cases and state management');
    complexityRisks.push('Hidden edge cases may expand the first version');
  }

  if (/marketplace|multi-user|real-time|dispatch|route optimization|parser|extract|ocr|pdf/.test(text)) {
    size = 'L';
    estimatedBuilderHours = 18;
    buildConfidence = 'low';
    effortReasons.push('The V1 depends on more moving parts, messy inputs, or higher implementation uncertainty');
    complexityRisks.push('Input handling or algorithm complexity may exceed the initial scope');
  }

  if (!/auth|account|team|permissions/.test(text)) {
    effortReasons.push('No authentication or multi-user system required for the first version');
  }

  if (!/integration|calendar|stripe|gmail|slack|webhook|api/.test(text)) {
    effortReasons.push('Few or no required third-party integrations for the first pass');
  } else {
    complexityRisks.push('Third-party integration work may introduce unexpected setup time');
  }

  return {
    size,
    estimatedBuilderHours,
    buildConfidence,
    effortReasons: dedupeStrings(effortReasons).slice(0, 4),
    complexityRisks: dedupeStrings(complexityRisks).slice(0, 4),
  };
}

function sanitizeEffortEstimate(value: any, idea: any, projectType: string): Record<string, any> {
  const fallback = defaultEffortEstimate(idea, projectType);
  const size = ['XS', 'S', 'M', 'L'].includes(String(value?.size ?? '').toUpperCase())
    ? String(value.size).toUpperCase()
    : fallback.size;

  const parsedHours = Number(value?.estimatedBuilderHours);
  const estimatedBuilderHours = Number.isFinite(parsedHours)
    ? Math.max(4, Math.min(30, Math.round(parsedHours)))
    : fallback.estimatedBuilderHours;

  const confidence = String(value?.buildConfidence ?? '').toLowerCase();
  const buildConfidence = confidence === 'high' || confidence === 'medium' || confidence === 'low'
    ? confidence
    : fallback.buildConfidence;

  const effortReasons = normalizeStringArray(value?.effortReasons, 4, fallback.effortReasons);
  const complexityRisks = normalizeStringArray(value?.complexityRisks, 4, fallback.complexityRisks);

  return {
    size,
    estimatedBuilderHours,
    buildConfidence,
    effortReasons: dedupeStrings(effortReasons).slice(0, 4),
    complexityRisks: dedupeStrings(complexityRisks).slice(0, 4),
  };
}

function defaultOperationalNotes(idea: any, evaluation: any): string[] {
  const laneNote = idea.run_tag ? `Source batch: ${idea.run_tag}` : 'No run tag available';
  return [
    'Keep the first version narrow enough that one builder agent can scaffold it without manual product discovery',
    `Evaluation context: ${evaluation.notes ?? 'No evaluation notes available'}`,
    laneNote,
    'Do not add enterprise features until the core workflow is validated',
  ];
}

function defaultTrackingMetrics(idea: any): string[] {
  const archetype = inferArchetype(idea);
  if (archetype === 'directory') return ['Searches started', 'Detail page views', 'Outbound clicks or shortlist saves'];
  if (archetype === 'automation') return ['Workflow runs started', 'Successful output exports', 'Failure rate by input type'];
  if (archetype === 'calculator') return ['Estimate completions', 'CTA click-through rate', 'Qualified follow-up requests'];
  if (archetype === 'scheduler') {
    const text = `${idea.title ?? ''} ${idea.summary ?? ''}`.toLowerCase();
    if (/route|dispatch|jobber/.test(text)) return ['Route plans started', 'Completed optimized routes', 'Exported or copied route plans'];
    return ['Booking flow starts', 'Completed booking requests', 'Confirmed appointments'];
  }
  return ['Landing page conversion rate', 'Primary workflow completion rate', 'Activated users or leads generated'];
}

function defaultGoNoGoCriteria(idea: any): string[] {
  const archetype = inferArchetype(idea);
  if (archetype === 'directory') {
    return [
      'At least 10 target users perform a search in the first 14 days',
      'At least 3 users click through to a provider or save a shortlist',
      'Source dataset proves good enough to keep listings accurate without heavy ops',
    ];
  }
  if (archetype === 'automation') {
    return [
      'At least 3 target users complete the workflow with real files or real data',
      'Output quality is good enough that users do not have to redo most of the work manually',
      'The supported input format stays narrow enough to avoid a custom-integration trap',
    ];
  }
  if (archetype === 'scheduler') {
    const text = `${idea.title ?? ''} ${idea.summary ?? ''}`.toLowerCase();
    if (/route|dispatch|jobber/.test(text)) {
      return [
        'At least 3 target users generate a real route plan using their actual daily jobs',
        'Users accept the suggested stop order without major manual rework',
        'The route input remains narrow enough that the first version does not require deep platform integrations',
      ];
    }
    return [
      'At least 3 target users complete a booking request flow',
      'At least 1 business confirms the workflow is faster than its current scheduling process',
      'Availability rules stay simple enough for a narrow V1',
    ];
  }
  return [
    'At least 3 target users complete the primary workflow',
    'At least 1 clear monetization or willingness-to-pay signal appears within 14 days',
    'No major hidden implementation complexity appears during the first build pass',
  ];
}

function buildProjectNotes(idea: any, evaluation: any, plan: Record<string, any>): string {
  const recommendedWedge = deriveRecommendedWedge(idea, plan);
  const approvalSummary = buildApprovalSummary(idea, evaluation, plan);
  return `# ${idea.title}

> ${idea.summary}

## Evaluation
- Score: ${evaluation.score_total}/100
- Recommendation: ${evaluation.recommendation}
- Notes: ${evaluation.notes ?? 'n/a'}

## Recommended Wedge
- ${recommendedWedge}

## Why Approve This
${approvalSummary.map((line: string) => `- ${line}`).join('\n')}

## Problem
- Audience: ${idea.audience ?? 'n/a'}
- Pain: ${idea.pain ?? 'n/a'}
- Workaround: ${idea.workaround ?? 'n/a'}
- Frequency: ${idea.frequency ?? 'n/a'}

## Plan Snapshot
- Project type: ${plan.projectType}
- Monetization: ${(plan.primaryMonetization ?? []).join(', ')}
- Success metric: ${plan.mvpDefinition?.successMetric ?? 'n/a'}

## Execution Context
- Trigger: ${plan.executionContext?.trigger ?? 'n/a'}
- Inputs: ${(plan.executionContext?.coreInputs ?? []).join('; ')}
- Outputs: ${(plan.executionContext?.coreOutputs ?? []).join('; ')}

## Must-Have V1
${(plan.executionContext?.mustHaveV1Features ?? []).map((feature: string) => `- ${feature}`).join('\n')}

## Out Of Scope For V1
${(plan.executionContext?.outOfScopeForV1 ?? []).map((item: string) => `- ${item}`).join('\n')}

## Validation Plan
- Channels: ${(plan.testPlan?.channels ?? []).join(', ')}
- Tracking: ${(plan.testPlan?.tracking ?? []).join('; ')}
- Go/No-Go: ${(plan.testPlan?.goNoGo ?? []).join('; ')}

## Build Notes
${(plan.buildPlan?.steps ?? []).map((step: string) => `- ${step}`).join('\n')}
`;
}

function deriveRecommendedWedge(idea: any, plan: Record<string, any>): string {
  const targetUser = String(plan.targetUser ?? idea.audience ?? 'niche user').trim();
  const trigger = String(plan.executionContext?.trigger ?? defaultTrigger(idea)).trim();
  const pitch = String(plan.oneSentencePitch ?? idea.summary ?? idea.title).trim();
  return `${targetUser} — ${pitch}. Trigger: ${trigger}`;
}

function buildApprovalSummary(idea: any, evaluation: any, plan: Record<string, any>): string[] {
  const lines: string[] = [];
  const channels = plan.testPlan?.channels ?? [];
  const risks = plan.buildPlan?.risks ?? [];
  const monetization = plan.primaryMonetization ?? [];

  lines.push(`Primary wedge: ${deriveRecommendedWedge(idea, plan)}`);
  lines.push(`Reason to build: ${idea.pain ?? idea.summary ?? idea.title}`);
  lines.push(`Why now: ${idea.why_now ?? idea.whyNow ?? 'n/a'}`);
  lines.push(`Main GTM angle: ${channels.length > 0 ? channels.join(', ') : 'n/a'}`);
  lines.push(`Primary monetization: ${monetization.length > 0 ? monetization.join(', ') : 'n/a'}`);
  lines.push(`Main execution risk: ${risks.length > 0 ? risks[0] : 'Unknown risk'}`);
  lines.push(`Builder focus: ${(plan.executionContext?.mustHaveV1Features ?? []).slice(0, 2).join('; ') || 'Keep the first workflow narrow'}`);
  lines.push(`Evaluation score: ${evaluation.score_total}/100`);

  return lines;
}

function buildPlanningBrief(idea: any, evaluation: any): string {
  const archetype = inferArchetype(idea);
  const acquisition = normalizeChannels([], idea.distribution_paths).join(', ');
  const effort = defaultEffortEstimate(idea, normalizeProjectType(idea.asset_type_hint, idea.asset_type_hint, idea.title, idea.summary));
  return [
    `Archetype: ${archetype}`,
    `Recommended wedge: ${deriveRecommendedWedge(idea, { oneSentencePitch: idea.summary ?? idea.title, targetUser: idea.audience, executionContext: { trigger: defaultTrigger(idea) } })}`,
    `Preferred build shape: ${defaultBuildSteps(idea).join(' | ')}`,
    `Must-have features: ${defaultMustHaveFeatures(idea).join(' | ')}`,
    `Likely tracking: ${defaultTrackingMetrics(idea).join(' | ')}`,
    `Likely go/no-go checks: ${defaultGoNoGoCriteria(idea).join(' | ')}`,
    `Preferred acquisition channels: ${acquisition}`,
    `Expected effort: ${effort.size} (${effort.estimatedBuilderHours} hours, confidence: ${effort.buildConfidence})`,
    `Effort reasons: ${effort.effortReasons.join(' | ')}`,
    `Complexity risks: ${effort.complexityRisks.join(' | ')}`,
    `Evaluation signal: ${evaluation.notes ?? 'n/a'}`,
  ].join('\n');
}

function inferArchetype(idea: any): 'directory' | 'automation' | 'calculator' | 'scheduler' | 'generic' {
  const text = `${idea.title ?? ''} ${idea.summary ?? ''} ${idea.asset_type_hint ?? ''}`.toLowerCase();
  if (/directory|comparison|search|lookup|finder|provider|registry|listing/.test(text)) return 'directory';
  if (/scheduler|booking|appointment|calendar|route|dispatch/.test(text)) return 'scheduler';
  if (/calculator|estimator|quote|pricing|cost/.test(text)) return 'calculator';
  if (/automation|workflow|processing|parser|extract|generator|report/.test(text)) return 'automation';
  return 'generic';
}

function sanitizeDeliverables(value: unknown, idea: any, projectType: string): string[] {
  const deliverables = normalizeStringArray(value, 5, defaultDeliverables(idea, projectType));
  return shouldUseArchetypeFallback(deliverables, idea) ? defaultDeliverables(idea, projectType) : dedupeStrings(deliverables).slice(0, 5);
}

function sanitizeBuildSteps(value: unknown, idea: any, projectType: string): string[] {
  const steps = normalizeStringArray(value, 7, defaultBuildSteps(idea));
  return shouldUseArchetypeFallback(steps, idea) ? defaultBuildSteps(idea) : dedupeStrings(steps).slice(0, 7);
}

function sanitizeTechStack(value: unknown, idea: any, _projectType: string): string[] {
  const tech = normalizeStringArray(value, 6, defaultTechStack(idea));
  return dedupeStrings(tech).slice(0, 6);
}

function sanitizeRisks(value: unknown, idea: any): string[] {
  const risks = normalizeStringArray(value, 5, defaultRisks(idea));
  return dedupeStrings(risks).slice(0, 5);
}

function sanitizeFeatures(value: unknown, idea: any, _projectType: string): string[] {
  const features = normalizeStringArray(value, 6, defaultMustHaveFeatures(idea));
  return shouldUseArchetypeFallback(features, idea) ? defaultMustHaveFeatures(idea) : dedupeStrings(features).slice(0, 6);
}

function sanitizeOperationalNotes(value: unknown, idea: any, evaluation: any): string[] {
  const notes = normalizeStringArray(value, 5, defaultOperationalNotes(idea, evaluation));
  return dedupeStrings(notes).slice(0, 5);
}

function sanitizeTrackingMetrics(value: unknown, idea: any, _projectType: string): string[] {
  const tracking = normalizeStringArray(value, 5, defaultTrackingMetrics(idea));
  return shouldUseArchetypeFallback(tracking, idea) ? defaultTrackingMetrics(idea) : dedupeStrings(tracking).slice(0, 5);
}

function sanitizeGoNoGoCriteria(value: unknown, idea: any, _projectType: string): string[] {
  const criteria = normalizeStringArray(value, 5, defaultGoNoGoCriteria(idea));
  return shouldUseArchetypeFallback(criteria, idea) ? defaultGoNoGoCriteria(idea) : dedupeStrings(criteria).slice(0, 5);
}

function sanitizeSuccessMetric(value: unknown, idea: any, _projectType: string): string {
  const metric = String(value ?? '').trim();
  if (!metric || /10 active users|50 email signups|first month|first week|complete the primary workflow$/i.test(metric)) {
    return defaultSuccessMetric(idea);
  }
  if (shouldUseArchetypeFallback([metric], idea)) return defaultSuccessMetric(idea);
  return metric;
}

function defaultDeliverables(idea: any, projectType: string): string[] {
  const archetype = inferArchetype(idea);
  if (archetype === 'directory' || projectType === 'directory') {
    return ['Imported source dataset', 'Search and filter interface', 'Provider or listing detail page', 'Outbound click or shortlist tracking'];
  }
  if (archetype === 'automation') {
    return ['Single supported input workflow', 'Structured output review screen', 'Export or handoff action', 'Usage and failure tracking'];
  }
  if (archetype === 'calculator') {
    return ['Estimate input form', 'Transparent pricing or estimate output', 'Lead capture or follow-up CTA'];
  }
  if (archetype === 'scheduler') {
    const text = `${idea.title ?? ''} ${idea.summary ?? ''}`.toLowerCase();
    if (/route|dispatch|jobber/.test(text)) {
      return ['Route input flow for one day of jobs', 'Optimized stop list with travel estimates', 'Manual review and reorder screen', 'Copy or export route plan'];
    }
    return ['Availability rules for one service', 'Booking request flow', 'Confirmation or notification step'];
  }
  return ['Landing page', 'Core workflow', 'Basic analytics'];
}

function looksGeneric(values: string[]): boolean {
  const genericPatterns = [
    /set up .*next\.js/i,
    /tailwind/i,
    /deploy on vercel/i,
    /basic user authentication/i,
    /simple user interface/i,
    /active users within the first month/i,
    /email signups within the first week/i,
  ];
  const genericCount = values.filter(value => genericPatterns.some(pattern => pattern.test(value))).length;
  return genericCount >= 2;
}

function shouldUseArchetypeFallback(values: string[], idea: any): boolean {
  if (looksGeneric(values)) return true;

  const text = values.join(' ').toLowerCase();
  const archetype = inferArchetype(idea);

  if (archetype === 'calculator') {
    return !/(estimate|quote|pricing|cost|breakdown)/.test(text);
  }

  if (archetype === 'directory') {
    return !/(search|filter|listing|detail|dataset|provider|compare|shortlist)/.test(text);
  }

  if (archetype === 'automation') {
    return !/(upload|import|parse|extract|transform|export|workflow|report)/.test(text);
  }

  if (archetype === 'scheduler') {
    const hasSchedulerTerms = /(booking|appointment|availability|schedule|route|dispatch|stop order|travel)/.test(text);
    const hasCalculatorTerms = /(estimate|quote|pricing|cost breakdown)/.test(text);
    return !hasSchedulerTerms || hasCalculatorTerms;
  }

  return false;
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
