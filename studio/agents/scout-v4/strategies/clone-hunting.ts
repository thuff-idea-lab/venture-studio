import { fetchProductHuntLaunches } from '../sources/producthunt';
import { fetchTrendingRepos } from '../sources/github-trending';
import { fetchLowRatedExtensions, CWS_CATEGORIES } from '../sources/chrome-web-store';
import { logger } from '../../../lib/logger';
import type { RawSignal, StrategyName } from '../types';

const STRATEGY: StrategyName = 'clone_hunting';
const STRATEGY_CAP = 15;

function seededPick<T>(items: T[], count: number, seed: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1) * 2654435761) >>> 0) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export async function runCloneHunting(): Promise<RawSignal[]> {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );

  const signals: RawSignal[] = [];

  // 1. Product Hunt — latest launches
  try {
    const phSignals = await fetchProductHuntLaunches(STRATEGY);
    signals.push(...phSignals.slice(0, 10));
    logger.info('scout-v4', `Clone hunting: ${phSignals.length} Product Hunt signals`);
  } catch (err: any) {
    logger.warn('scout-v4', `Clone hunting PH failed: ${err.message}`);
  }

  // 2. GitHub Trending — recent repos with moderate traction
  try {
    const ghSignals = await fetchTrendingRepos({
      minStars: 50,
      maxStars: 5000,
      strategy: STRATEGY,
    });
    signals.push(...ghSignals.slice(0, 15));
    logger.info('scout-v4', `Clone hunting: ${ghSignals.length} GitHub signals`);
  } catch (err: any) {
    logger.warn('scout-v4', `Clone hunting GitHub failed: ${err.message}`);
  }

  // 3. Chrome Web Store — low-rated extensions as opportunity signals
  try {
    const selectedCategories = seededPick(CWS_CATEGORIES, 3, dayOfYear);
    const cwsSignals = await fetchLowRatedExtensions(selectedCategories, STRATEGY);
    signals.push(...cwsSignals.slice(0, 10));
    logger.info('scout-v4', `Clone hunting: ${cwsSignals.length} Chrome Web Store signals`);
  } catch (err: any) {
    logger.warn('scout-v4', `Clone hunting CWS failed: ${err.message}`);
  }

  logger.info('scout-v4', `Clone hunting: ${signals.length} total signals`);
  return signals.slice(0, STRATEGY_CAP);
}
