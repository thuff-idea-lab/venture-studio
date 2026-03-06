import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from '../../lib/logger';
import { db } from '../../lib/db';
import { fetchRedditRSS } from './sources/reddit';
import { fetchHackerNews } from './sources/hackernews';
import type { IdeaRecord } from './types';

const AGENT = 'scout';

export async function runScout(): Promise<IdeaRecord[]> {
  logger.info(AGENT, 'Starting scout run');

  const ideas: IdeaRecord[] = [];

  // Fetch from all sources
  const [redditIdeas, hnIdeas] = await Promise.allSettled([
    fetchRedditRSS(),
    fetchHackerNews(),
  ]);

  if (redditIdeas.status === 'fulfilled') ideas.push(...redditIdeas.value);
  else logger.warn(AGENT, 'Reddit fetch failed', redditIdeas.reason);

  if (hnIdeas.status === 'fulfilled') ideas.push(...hnIdeas.value);
  else logger.warn(AGENT, 'HN fetch failed', hnIdeas.reason);

  logger.info(AGENT, `Found ${ideas.length} raw ideas`);

  // Write to DB
  for (const idea of ideas) {
    await db.from('ideas').insert({
      title: idea.title,
      summary: idea.summary,
      evidence: idea.evidence,
      sources: idea.sources,
      keywords: idea.keywords,
      tags: idea.tags,
      asset_type_hint: idea.assetTypeHint,
    });
  }

  logger.info(AGENT, `Scout complete — ${ideas.length} ideas written to DB`);
  return ideas;
}
