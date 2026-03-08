import { searchReddit, listSubreddit } from '../sources/reddit';
import { searchHN } from '../sources/hackernews';
import { logger } from '../../../lib/logger';
import type { RawSignal, StrategyName } from '../types';

const STRATEGY: StrategyName = 'pain_mining';

const PAIN_QUERIES: string[] = [
  'I still do this manually',
  'takes me hours every week',
  'I copy paste from',
  'there has to be a better way',
  'I built a spreadsheet to',
  'I hate doing this every',
  'our process for this is broken',
  'we use 3 different tools to',
  'I spend too much time on',
  'anyone else frustrated with',
  'is there a tool that',
  'I wish I could automate',
  'why is there no simple',
  'I keep running into this problem',
  'does anyone have a system for',
  'how do you keep track of',
  'I dread doing this every',
];

const PAIN_SUBREDDITS: Record<string, string[]> = {
  professional_services: [
    'r/Accounting', 'r/Bookkeeping', 'r/tax',
    'r/LawFirm', 'r/paralegal',
    'r/PropertyManagement', 'r/Landlord',
    'r/InsurancePros',
    'r/Dentistry', 'r/VetTech',
    'r/Optometry',
  ],
  trades_and_local: [
    'r/restaurateur', 'r/coffeeshops', 'r/bartenders',
    'r/salons', 'r/barbershop',
    'r/AutoDetailing', 'r/AutoMechanic',
    'r/HVAC', 'r/Plumbing', 'r/Electricians',
    'r/landscaping', 'r/lawncare',
    'r/photography', 'r/weddingplanning',
    'r/gym', 'r/personaltraining',
    'r/CleaningTips',
  ],
  small_business: [
    'r/smallbusiness', 'r/entrepreneur', 'r/Solopreneur',
    'r/freelance', 'r/consulting',
    'r/ecommerce', 'r/dropship',
  ],
  creators_and_sellers: [
    'r/EtsySellers', 'r/AmazonSeller', 'r/AmazonFBA',
    'r/Flipping', 'r/printondemand',
    'r/youtubers', 'r/Twitch', 'r/podcasting',
    'r/ContentCreation', 'r/NewTubers',
    'r/graphic_design', 'r/copywriting',
    'r/blogging',
  ],
  teachers_and_education: [
    'r/Teachers', 'r/teaching', 'r/Professors',
    'r/tutoring', 'r/OnlineTutoring',
  ],
  healthcare_ops: [
    'r/Nurses', 'r/pharmacy', 'r/MedicalBilling',
    'r/healthIT',
  ],
  tech_ops: [
    'r/sysadmin', 'r/devops', 'r/webdev',
    'r/selfhosted', 'r/microsaas',
    'r/SideProject',
  ],
};

const HN_PAIN_QUERIES: string[] = [
  'How do you handle',
  'What do you use for',
  'Anyone built a tool for',
  'Frustrated with',
  'Looking for alternative to',
];

/**
 * Seeded rotation: pick a subset deterministically based on day-of-year.
 */
function seededPick<T>(items: T[], count: number, seed: number): T[] {
  const shuffled = [...items];
  // Simple deterministic shuffle using seed
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1) * 2654435761) >>> 0) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

const STRATEGY_CAP = 30;

export async function runPainMining(): Promise<RawSignal[]> {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );

  const selectedQueries = seededPick(PAIN_QUERIES, 7, dayOfYear);
  const groupNames = Object.keys(PAIN_SUBREDDITS);
  const selectedGroups = seededPick(groupNames, 3, dayOfYear + 100);

  // Flatten selected subreddit groups
  const subreddits = selectedGroups.flatMap(g => PAIN_SUBREDDITS[g]);

  logger.info('scout-v4', `Pain mining: ${selectedQueries.length} queries × ${subreddits.length} subreddits`);

  const signals: RawSignal[] = [];

  // Reddit searches
  for (const query of selectedQueries) {
    if (signals.length >= STRATEGY_CAP) break;

    // Pick 2-3 subreddits per query to stay within budget
    const subSample = seededPick(subreddits, 3, dayOfYear + query.length);
    for (const sub of subSample) {
      if (signals.length >= STRATEGY_CAP) break;
      try {
        const results = await searchReddit({
          query,
          subreddit: sub,
          sort: 'new',
          time: 'year',
          limit: 10,
          strategy: STRATEGY,
        });
        signals.push(...results);
      } catch (err: any) {
        logger.warn('scout-v4', `Pain mining Reddit search failed: ${err.message}`);
      }
    }
  }

  // HN searches
  for (const query of HN_PAIN_QUERIES) {
    if (signals.length >= STRATEGY_CAP) break;
    try {
      const results = await searchHN({
        query,
        tags: 'ask_hn',
        numericFilters: 'points>5',
        hitsPerPage: 10,
        strategy: STRATEGY,
      });
      signals.push(...results);
    } catch (err: any) {
      logger.warn('scout-v4', `Pain mining HN search failed: ${err.message}`);
    }
  }

  logger.info('scout-v4', `Pain mining: collected ${signals.length} signals`);
  return signals.slice(0, STRATEGY_CAP);
}
