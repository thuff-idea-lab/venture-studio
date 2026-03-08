import axios from 'axios';
import { logger } from '../../../lib/logger';

interface SERPResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SERPCheckResult {
  competition_level: 'NONE' | 'WEAK' | 'MODERATE' | 'STRONG' | 'UNKNOWN';
  top_results: SERPResult[];
}

let monthlyUsage = 0;

/**
 * Check SERP for a query. Uses SerpApi (free tier) with Google CSE fallback.
 */
export async function checkSERP(query: string): Promise<SERPCheckResult> {
  // Try SerpApi first
  const serpApiKey = process.env.SERP_API_KEY;
  if (serpApiKey && monthlyUsage < 100) {
    try {
      const result = await querySerpApi(query, serpApiKey);
      monthlyUsage++;
      return result;
    } catch (err: any) {
      logger.warn('scout-v4', `SerpApi failed: ${err.message}, trying CSE fallback`);
    }
  }

  // Fallback: Google CSE
  const cseId = process.env.GOOGLE_CSE_ID;
  const cseKey = process.env.GOOGLE_CSE_API_KEY;
  if (cseId && cseKey) {
    try {
      return await queryGoogleCSE(query, cseId, cseKey);
    } catch (err: any) {
      logger.warn('scout-v4', `Google CSE failed: ${err.message}`);
    }
  }

  return { competition_level: 'UNKNOWN', top_results: [] };
}

async function querySerpApi(query: string, apiKey: string): Promise<SERPCheckResult> {
  const res = await axios.get('https://serpapi.com/search.json', {
    params: {
      q: query,
      api_key: apiKey,
      engine: 'google',
      num: 10,
    },
    timeout: 15000,
  });

  const organic: any[] = res.data.organic_results ?? [];
  const topResults: SERPResult[] = organic.slice(0, 10).map((r: any) => ({
    title: r.title ?? '',
    url: r.link ?? '',
    snippet: r.snippet ?? '',
  }));

  return {
    competition_level: classifyCompetition(topResults),
    top_results: topResults,
  };
}

async function queryGoogleCSE(
  query: string,
  cseId: string,
  apiKey: string
): Promise<SERPCheckResult> {
  const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
    params: { q: query, key: apiKey, cx: cseId, num: 10 },
    timeout: 15000,
  });

  const items: any[] = res.data.items ?? [];
  const topResults: SERPResult[] = items.slice(0, 10).map((r: any) => ({
    title: r.title ?? '',
    url: r.link ?? '',
    snippet: r.snippet ?? '',
  }));

  return {
    competition_level: classifyCompetition(topResults),
    top_results: topResults,
  };
}

function classifyCompetition(
  results: SERPResult[]
): 'NONE' | 'WEAK' | 'MODERATE' | 'STRONG' {
  if (results.length === 0) return 'UNKNOWN' as any;

  const top5 = results.slice(0, 5);

  const forumCount = top5.filter(r =>
    /reddit\.com|forum|quora|stackexchange|community/i.test(r.url)
  ).length;

  if (forumCount >= 3) return 'NONE';

  const hasEnterprise = top5.every(r =>
    /(pricing|enterprise|contact sales|book a demo|schedule)/i.test(r.snippet)
  );
  if (hasEnterprise) return 'WEAK';

  const hasPurposeBuilt = top5.some(r =>
    !/(reddit|quora|medium|wordpress|blogspot|youtube|forum)/i.test(r.url) &&
    /(calculator|tool|app|software|generator|tracker|planner|free|try|sign up)/i.test(r.snippet)
  );
  if (hasPurposeBuilt) return 'MODERATE';

  return 'WEAK';
}

export function getSerpBudgetRemaining(): number {
  return Math.max(0, 100 - monthlyUsage);
}
