import { getAutocompletions } from '../sources/google-autocomplete';
import { checkSERP, getSerpBudgetRemaining } from '../sources/serp';
import { logger } from '../../../lib/logger';
import type { RawSignal, StrategyName } from '../types';

const STRATEGY: StrategyName = 'gap_detection';

const GAP_TEMPLATES: string[] = [
  '{profession} template for',
  '{profession} software',
  '{profession} app',
  '{profession} tool',
  '{task} automation',
  '{task} tracker',
  '{task} generator',
  '{task} planner',
  '{task} scheduler',
  '{task} reminder',
  '{task} checklist',
  'free {thing} tool',
  'simple {thing} app',
  'how to {task} online',
  'best way to {task}',
  '{thing} for small business',
  'cheap alternative to {product}',
];

const PROFESSIONS: string[] = [
  'photographer', 'realtor', 'plumber', 'electrician',
  'tutor', 'freelancer', 'landscaper', 'personal trainer',
  'dog groomer', 'wedding planner', 'accountant', 'dentist',
  'therapist', 'contractor', 'notary', 'property manager',
  'yoga instructor', 'music teacher', 'caterer', 'florist',
  'mechanic', 'barber', 'tattoo artist', 'massage therapist',
];

const TASKS: string[] = [
  'invoice', 'appointment', 'client', 'booking',
  'scheduling', 'inventory', 'expense', 'receipt',
  'quote', 'estimate', 'contract', 'follow up',
  'meal prep', 'workout', 'habit', 'budget',
  'project', 'content', 'social media', 'review',
];

const THINGS: string[] = [
  'invoice', 'scheduling', 'client management', 'booking',
  'inventory', 'expense tracking', 'receipt scanner',
  'contract', 'proposal', 'portfolio', 'roster',
];

const PRODUCTS: string[] = [
  'calendly', 'quickbooks', 'mailchimp', 'canva',
  'notion', 'airtable', 'zapier', 'hubspot',
];

function seededPick<T>(items: T[], count: number, seed: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1) * 2654435761) >>> 0) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function expandTemplate(template: string, seed: number): string {
  if (template.includes('{profession}')) {
    const prof = PROFESSIONS[seed % PROFESSIONS.length];
    return template.replace('{profession}', prof);
  }
  if (template.includes('{task}')) {
    const task = TASKS[seed % TASKS.length];
    return template.replace('{task}', task);
  }
  if (template.includes('{thing}')) {
    const thing = THINGS[seed % THINGS.length];
    return template.replace('{thing}', thing);
  }
  if (template.includes('{product}')) {
    const product = PRODUCTS[seed % PRODUCTS.length];
    return template.replace('{product}', product);
  }
  return template;
}

const STRATEGY_CAP = 25;

export async function runGapDetection(): Promise<RawSignal[]> {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );

  // Pick 15-20 template+variable combinations
  const selectedTemplates = seededPick(GAP_TEMPLATES, 10, dayOfYear);
  const queries: string[] = [];

  for (let i = 0; i < selectedTemplates.length; i++) {
    const expanded = expandTemplate(selectedTemplates[i], dayOfYear + i);
    queries.push(expanded);
    // Add a second expansion with different variable
    const expanded2 = expandTemplate(selectedTemplates[i], dayOfYear + i + 50);
    if (expanded2 !== expanded) {
      queries.push(expanded2);
    }
  }

  logger.info('scout-v4', `Gap detection: ${queries.length} autocomplete queries`);

  // 1. Collect all completions
  const allCompletions: string[] = [];
  for (const query of queries) {
    try {
      const completions = await getAutocompletions(query);
      allCompletions.push(...completions);
    } catch {
      // Individual failure — continue
    }
  }

  // 2. Deduplicate completions
  const uniqueCompletions = [...new Set(
    allCompletions.map(c => c.toLowerCase().trim())
  )].slice(0, 30);

  logger.info('scout-v4', `Gap detection: ${uniqueCompletions.length} unique completions`);

  // 3. SERP check top completions for gaps
  const signals: RawSignal[] = [];
  let serpChecks = 0;
  const maxSerpChecks = Math.min(20, getSerpBudgetRemaining());

  for (const completion of uniqueCompletions) {
    if (signals.length >= STRATEGY_CAP) break;

    if (serpChecks < maxSerpChecks) {
      try {
        const serp = await checkSERP(completion);
        serpChecks++;

        // Gap confirmed: top results are forums/articles (no good tool exists)
        if (serp.competition_level === 'NONE' || serp.competition_level === 'WEAK') {
          signals.push({
            title: completion,
            body: `Search gap detected: "${completion}" — top results are ${
              serp.competition_level === 'NONE' ? 'forums and articles' : 'enterprise/bloated tools'
            }. ${serp.top_results.map(r => r.title).slice(0, 3).join('; ')}`,
            url: `https://www.google.com/search?q=${encodeURIComponent(completion)}`,
            platform: 'google_autocomplete',
            strategy: STRATEGY,
            metadata: {
              competition_level: serp.competition_level,
              serp_titles: serp.top_results.map(r => r.title).slice(0, 5),
            },
          });
        }
      } catch {
        // SERP check failure — include as lower-confidence signal
        signals.push({
          title: completion,
          body: `Autocomplete signal: "${completion}" — SERP check unavailable`,
          url: `https://www.google.com/search?q=${encodeURIComponent(completion)}`,
          platform: 'google_autocomplete',
          strategy: STRATEGY,
        });
      }
    } else {
      // No SERP budget — include as unvalidated signal
      signals.push({
        title: completion,
        body: `Autocomplete signal: "${completion}" — SERP budget exhausted`,
        url: `https://www.google.com/search?q=${encodeURIComponent(completion)}`,
        platform: 'google_autocomplete',
        strategy: STRATEGY,
      });
    }
  }

  logger.info('scout-v4', `Gap detection: ${signals.length} signals (${serpChecks} SERP checks used)`);
  return signals.slice(0, STRATEGY_CAP);
}
