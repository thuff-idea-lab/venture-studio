import { db } from '../../lib/db';
import { logger } from '../../lib/logger';
import { runPainMining } from './strategies/pain-mining';
import { runGapDetection } from './strategies/gap-detection';
import { runCloneHunting } from './strategies/clone-hunting';
import { runTrendSurfing } from './strategies/trend-surfing';
import { runPlatformGaps } from './strategies/platform-gaps';
import { runReviewMining } from './strategies/review-mining';
import { deduplicateRawSignals, isDuplicate } from './dedup';
import { extractIdea } from './extract';
import { validateCandidate } from './validation/validate-candidate';
import type { RawSignal, ExtractedIdea, ScoutV4Idea } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Main orchestrator for Scout V4.
 * Runs all 6 strategies, deduplicates, extracts via LLM, validates, and writes to DB.
 */
export async function runScoutV4(): Promise<void> {
  logger.info('scout-v4', 'Starting scout v4 run');
  const startTime = Date.now();

  // 1. Run all six strategies
  // Group by shared source dependencies to avoid rate limit collisions:
  // - Pain mining + Platform gaps + Review mining all use Reddit
  // - Gap detection uses Autocomplete + SERP
  // - Clone hunting uses PH + GitHub + CWS
  // - Trend surfing uses Trends + SERP + Reddit
  // Running them sequentially to be safe with Reddit rate limits
  logger.info('scout-v4', 'Phase 1: Running discovery strategies');

  let painSignals: RawSignal[] = [];
  let gapSignals: RawSignal[] = [];
  let cloneSignals: RawSignal[] = [];
  let trendSignals: RawSignal[] = [];
  let platformSignals: RawSignal[] = [];
  let reviewSignals: RawSignal[] = [];

  // Run clone hunting and gap detection in parallel (no Reddit dependency)
  const [cloneResult, gapResult] = await Promise.allSettled([
    runCloneHunting(),
    runGapDetection(),
  ]);

  cloneSignals = cloneResult.status === 'fulfilled' ? cloneResult.value : [];
  gapSignals = gapResult.status === 'fulfilled' ? gapResult.value : [];

  if (cloneResult.status === 'rejected') {
    logger.error('scout-v4', `Clone hunting strategy failed: ${cloneResult.reason}`);
  }
  if (gapResult.status === 'rejected') {
    logger.error('scout-v4', `Gap detection strategy failed: ${gapResult.reason}`);
  }

  // Run Reddit-dependent strategies sequentially
  try {
    painSignals = await runPainMining();
  } catch (err: any) {
    logger.error('scout-v4', `Pain mining strategy failed: ${err.message}`);
  }

  try {
    platformSignals = await runPlatformGaps();
  } catch (err: any) {
    logger.error('scout-v4', `Platform gaps strategy failed: ${err.message}`);
  }

  try {
    reviewSignals = await runReviewMining();
  } catch (err: any) {
    logger.error('scout-v4', `Review mining strategy failed: ${err.message}`);
  }

  try {
    trendSignals = await runTrendSurfing();
  } catch (err: any) {
    logger.error('scout-v4', `Trend surfing strategy failed: ${err.message}`);
  }

  const rawTotal =
    painSignals.length + gapSignals.length + cloneSignals.length +
    trendSignals.length + platformSignals.length + reviewSignals.length;

  logger.info('scout-v4', `Phase 1 complete: ${rawTotal} raw signals`, {
    pain: painSignals.length,
    gap: gapSignals.length,
    clone: cloneSignals.length,
    trend: trendSignals.length,
    platform: platformSignals.length,
    review: reviewSignals.length,
  });

  // 2. Merge + within-run dedup
  logger.info('scout-v4', 'Phase 2: Deduplicating signals');
  const allSignals = deduplicateRawSignals([
    ...painSignals,
    ...gapSignals,
    ...cloneSignals,
    ...trendSignals,
    ...platformSignals,
    ...reviewSignals,
  ]);

  logger.info('scout-v4', `${allSignals.length} signals after dedup (from ${rawTotal} raw)`);

  // 3. LLM extraction
  logger.info('scout-v4', 'Phase 3: LLM extraction');
  const extracted: { idea: ExtractedIdea; signal: RawSignal }[] = [];

  for (const signal of allSignals) {
    try {
      const result = await extractIdea(signal);
      if (result !== null) {
        extracted.push({ idea: result, signal });
      }
    } catch (err: any) {
      logger.warn('scout-v4', `Extraction error for "${signal.title}": ${err.message}`);
    }
  }

  logger.info('scout-v4', `${extracted.length} ideas extracted from ${allSignals.length} signals`);

  // 4. Cross-run dedup against DB
  logger.info('scout-v4', 'Phase 4: Cross-run deduplication');
  const novel: { idea: ExtractedIdea; signal: RawSignal }[] = [];

  for (const entry of extracted) {
    if (!(await isDuplicate(entry.idea))) {
      novel.push(entry);
    }
  }

  logger.info('scout-v4', `${novel.length} novel ideas (${extracted.length - novel.length} duplicates removed)`);

  // 5. Validation layer
  logger.info('scout-v4', 'Phase 5: Validating candidates');
  const validated: ScoutV4Idea[] = [];
  let serpBudget = 20;

  for (const { idea, signal } of novel) {
    const skipSerp = serpBudget <= 0 && idea.confidence !== 'HIGH';
    const validation = await validateCandidate(idea, { skipSerp });
    if (!skipSerp) serpBudget--;

    // Auto-reject: STRONG competition + no demand signal
    if (
      validation.competition.competition_level === 'STRONG' &&
      !validation.demand.autocomplete_match
    ) {
      logger.info('scout-v4', `Auto-rejected (saturated + no demand): ${idea.title}`);
      continue;
    }

    validated.push({
      ...idea,
      summary: `${idea.pain} → ${idea.v1_description}`,
      sources: [{ platform: signal.platform, url: signal.url, strategy: signal.strategy }],
      validation,
      strategy: signal.strategy,
      extracted_at: new Date().toISOString(),
    });
  }

  logger.info('scout-v4', `${validated.length} ideas passed validation`);

  // 6. Write to DB (ideas_v4 table)
  logger.info('scout-v4', 'Phase 6: Writing to database');
  let dbWrites = 0;

  for (const idea of validated) {
    try {
      const { error } = await db.from('ideas_v4').insert({
        title: idea.title,
        summary: idea.summary,
        target_user: idea.target_user,
        pain: idea.pain,
        v1_description: idea.v1_description,
        frequency: idea.frequency,
        monetization: idea.monetization,
        distribution: idea.distribution,
        product_shape: idea.product_shape,
        build_hours_estimate: idea.build_hours_estimate,
        confidence: idea.confidence,
        sources: idea.sources,
        validation_data: idea.validation,
        strategy: idea.strategy,
        why_now: idea.why_now,
      });

      if (error) {
        logger.error('scout-v4', `DB write failed for "${idea.title}": ${error.message}`);
      } else {
        dbWrites++;
      }
    } catch (err: any) {
      logger.error('scout-v4', `DB write error for "${idea.title}": ${err.message}`);
    }
  }

  // 7. Write to ndjson for debugging
  try {
    const outDir = path.join(__dirname, '../../out');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const outFile = path.join(outDir, 'ideas-v4.ndjson');
    const lines = validated.map(idea => JSON.stringify(idea)).join('\n');
    fs.appendFileSync(outFile, lines + '\n');
  } catch (err: any) {
    logger.warn('scout-v4', `Failed to write ndjson: ${err.message}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info('scout-v4', `Scout v4 complete: ${dbWrites}/${validated.length} ideas written to DB in ${elapsed}s`);
}
