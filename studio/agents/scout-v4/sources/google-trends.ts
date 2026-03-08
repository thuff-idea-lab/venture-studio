import { logger } from '../../../lib/logger';

const DELAY_MS = 5000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface TrendInterestResult {
  interest: number;
  trend: 'RISING' | 'STABLE' | 'DECLINING' | 'NO_DATA';
}

interface RelatedQueriesResult {
  top: { query: string; value: number }[];
  rising: { query: string; value: string }[];
}

/**
 * Get Google Trends interest over time for a keyword.
 * Uses google-trends-api npm package (unofficial, free).
 */
export async function getTrendInterest(
  keyword: string,
  timeRange?: string
): Promise<TrendInterestResult> {
  try {
    const googleTrends = await import('google-trends-api');

    const result = await googleTrends.interestOverTime({
      keyword,
      startTime: timeRange
        ? new Date(timeRange)
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days default
      granularTimeResolution: false,
    });

    const parsed = JSON.parse(result);
    const timeline = parsed?.default?.timelineData;

    if (!timeline || timeline.length === 0) {
      return { interest: 0, trend: 'NO_DATA' };
    }

    const values = timeline.map((d: any) => d.value[0] as number);
    const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const recent = values.slice(-3);
    const recentAvg = recent.reduce((a: number, b: number) => a + b, 0) / recent.length;
    const early = values.slice(0, 3);
    const earlyAvg = early.reduce((a: number, b: number) => a + b, 0) / early.length;

    let trend: TrendInterestResult['trend'] = 'STABLE';
    if (earlyAvg > 0) {
      const change = (recentAvg - earlyAvg) / earlyAvg;
      if (change > 0.2) trend = 'RISING';
      else if (change < -0.2) trend = 'DECLINING';
    }

    return { interest: Math.round(avg), trend };
  } catch (err: any) {
    logger.warn('scout-v4', `Google Trends failed for "${keyword}": ${err.message}`);
    return { interest: 0, trend: 'NO_DATA' };
  }
}

/**
 * Get related queries for a keyword (top + rising).
 */
export async function getRelatedQueries(keyword: string): Promise<RelatedQueriesResult> {
  try {
    const googleTrends = await import('google-trends-api');

    const result = await googleTrends.relatedQueries({ keyword });
    const parsed = JSON.parse(result);

    const topData = parsed?.default?.rankedList?.[0]?.rankedKeyword ?? [];
    const risingData = parsed?.default?.rankedList?.[1]?.rankedKeyword ?? [];

    return {
      top: topData.map((item: any) => ({
        query: item.query as string,
        value: item.value as number,
      })),
      rising: risingData.map((item: any) => ({
        query: item.query as string,
        value: String(item.formattedValue ?? item.value),
      })),
    };
  } catch (err: any) {
    logger.warn('scout-v4', `Google Trends related queries failed for "${keyword}": ${err.message}`);
    return { top: [], rising: [] };
  }
}

/**
 * Delay between Trends queries to avoid throttling.
 */
export async function trendsDelay(): Promise<void> {
  await sleep(DELAY_MS);
}
