import type {
  OpportunityBucket,
  PostIntent,
  RawPost,
  SourceLane,
  SourcePriority,
} from './types';

const REJECT_PATTERNS = [
  /outage|down for anyone|not working|bugging out/i,
  /politics|election|government/i,
  /^introducing myself|new (here|member)/i,
  /just venting|rant:/i,
  /^show hn:/i,
  /anyone else/i,
  /am i the only one/i,
  /i built|i made|i launched|we launched|ship(ped|ping)|launch(ed)?/i,
  /roast my|shop critique|feedback request|need feedback|rate my/i,
  /case study|build in public|promo code/i,
  /^advice for( my)?( shop| store| business)?$/i,
];

const GENERIC_CHATTER_PATTERNS = [
  /what do you think/i,
  /rant/i,
  /vent/i,
  /unpopular opinion/i,
  /career advice/i,
  /burned out/i,
  /best strategy/i,
  /marketing strategy/i,
];

const EASY_BUILD_PATTERNS = [
  /calculator|estimator|quiz|directory|database|search|compare/i,
  /template|prompt|generator|finder|checklist|planner/i,
  /guide|optimizer|report|audit|diagnostic/i,
  /keyword|listing|title|description|caption/i,
  /cost|price|roi|sizing|fit/i,
];

const HARD_BUILD_PATTERNS = [
  /tax|compliance|reconciliation|dispute|payroll|legal/i,
  /security|encryption|infrastructure|observability/i,
  /trading bot|quant|hedge fund/i,
  /enterprise|erp|banking|accounting/i,
  /claims processing|audit trail|regulatory/i,
  /management|portal|back office|admin system|operations platform|reporting suite/i,
];

function countPatternMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function normalizeText(title: string, body?: string): string {
  const normalizedTitle = title.replace(/^ask hn:\s*/i, '').replace(/^show hn:\s*/i, '');
  return `${normalizedTitle} ${body ?? ''}`;
}

function isRejected(title: string, body?: string): boolean {
  const text = normalizeText(title, body);
  return REJECT_PATTERNS.some(pattern => pattern.test(text));
}

export function classifyIntent(title: string, body?: string): PostIntent {
  const text = normalizeText(title, body).toLowerCase();

  if (GENERIC_CHATTER_PATTERNS.some(pattern => pattern.test(text))) {
    return 'generic_chatter';
  }

  if (/i built|i made|i launched|feedback request|shop critique|roast my|build in public/.test(text)) {
    return 'generic_chatter';
  }

  if (/directory|database|public records|official registry|where can i find|search by zip|licensed in my area|compare providers/.test(text)) {
    return 'discovery_gap';
  }

  if (/descriptions|titles|keywords|captions|repurpose|content|thumbnail|listing/.test(text)) {
    return 'creator_task';
  }

  if (/too expensive|too complicated|missing feature|limitations|wish it had|hate using|limited|cumbersome|frustrat|confusing|learning curve|missing|outdated interface/.test(text)) {
    return 'tool_complaint';
  }

  if (/which one|best for|worth it|comparison|what do i need|how much does it cost|estimator|calculator|for beginners|for small space|for large yard|for my home|vs\.?\s|alternative to|best option|recommend/i.test(text)) {
    return 'buying_confusion';
  }

  if (/manually|spreadsheet|track|follow up|automate|takes too long|workflow|handle/.test(text)) {
    return 'workflow_pain';
  }

  return 'generic_chatter';
}

function inferBucket(intent: PostIntent, explicitBucket?: OpportunityBucket): OpportunityBucket {
  if (explicitBucket) return explicitBucket;

  switch (intent) {
    case 'buying_confusion':
      return 'buying';
    case 'discovery_gap':
      return 'discovery';
    case 'creator_task':
      return 'creator';
    default:
      return 'workflow';
  }
}

function scoreIntent(intent: PostIntent): number {
  switch (intent) {
    case 'tool_complaint':
      return 10;
    case 'workflow_pain':
      return 8;
    case 'creator_task':
      return 10;
    case 'discovery_gap':
      return 11;
    case 'buying_confusion':
      return 11;
    default:
      return -20;
  }
}

function scoreEngagement(score: number, comments: number): number {
  const scoreBoost = Math.min(score / 20, 5);
  const commentBoost = Math.min(comments / 10, 5);
  return scoreBoost + commentBoost;
}

function scoreEasyBuild(title: string, body?: string): number {
  return countPatternMatches(normalizeText(title, body), EASY_BUILD_PATTERNS) * 8;
}

function scoreHardBuildPenalty(title: string, body?: string): number {
  return countPatternMatches(normalizeText(title, body), HARD_BUILD_PATTERNS) * 10;
}

function laneAdjustment(sourceLane: SourceLane, sourcePriority: SourcePriority): number {
  let adjustment = 0;

  if (sourceLane === 'startup_ecosystem') adjustment -= 4;
  if (sourceLane === 'complaint_ecosystems') adjustment += 2;
  if (sourceLane === 'pain_communities') adjustment += 1;
  if (sourceLane === 'discovery_data_gaps') adjustment += 4;
  if (sourcePriority === 'validation') adjustment -= 2;

  return adjustment;
}

function computePrefilterScore(
  intent: PostIntent,
  easyBuildScore: number,
  hardBuildPenalty: number,
  score: number,
  comments: number,
  sourceLane: SourceLane,
  sourcePriority: SourcePriority
): number {
  return (
    scoreIntent(intent) +
    easyBuildScore -
    hardBuildPenalty +
    scoreEngagement(score, comments) +
    laneAdjustment(sourceLane, sourcePriority)
  );
}

function shouldKeepPost(post: RawPost): boolean {
  const metadata = post.metadata;
  if (!metadata) return true;
  if (metadata.intent === 'generic_chatter') return false;
  if ((metadata.hardBuildPenalty ?? 0) >= 20 && (metadata.easyBuildScore ?? 0) < 8) return false;

  const threshold =
    metadata.sourceLane === 'startup_ecosystem'
      ? 12
      : metadata.intent === 'workflow_pain'
        ? 10
        : 8;
  if ((metadata.prefilterScore ?? 0) < threshold) return false;

  return true;
}

interface EnrichOptions {
  bucket?: OpportunityBucket;
  sourceLane: SourceLane;
  sourceName: string;
  sourcePriority: SourcePriority;
}

export function enrichRawPost(post: RawPost, options: EnrichOptions): RawPost | null {
  if (isRejected(post.title, post.body)) return null;

  const intent = classifyIntent(post.title, post.body);
  const easyBuildScore = scoreEasyBuild(post.title, post.body);
  const hardBuildPenalty = scoreHardBuildPenalty(post.title, post.body);
  const prefilterScore = computePrefilterScore(
    intent,
    easyBuildScore,
    hardBuildPenalty,
    post.points ?? 0,
    post.comments ?? 0,
    options.sourceLane,
    options.sourcePriority
  );

  const enriched: RawPost = {
    ...post,
    metadata: {
      ...post.metadata,
      bucket: inferBucket(intent, options.bucket),
      intent,
      easyBuildScore,
      hardBuildPenalty,
      prefilterScore,
      sourceLane: options.sourceLane,
      sourceName: options.sourceName,
      sourcePriority: options.sourcePriority,
    },
  };

  return shouldKeepPost(enriched) ? enriched : null;
}

export function rankRawPost(post: RawPost): number {
  return (
    (post.metadata?.prefilterScore ?? 0) * 100 +
    (post.points ?? 0) * 2 +
    (post.comments ?? 0)
  );
}