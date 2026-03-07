import axios from 'axios';
import { logger } from '../../../lib/logger';
import { enrichRawPost } from '../prefilter';
import type { RawPost } from '../types';

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

const REVIEW_TEXT_MATCHER = /\\"text\\":\\"([\s\S]*?)\\",\\"textReview\\"/g;
const NAME_MATCHER = /\\"name\\":\\"((?:\\.|[^\\"])*)\\"/g;
const NEGATIVE_REVIEW_MARKER = '\\"negativeReviewSnippets\\":[';
const POSITIVE_REVIEW_MARKERS = [',\\"positiveReviewSnippets\\":[', ',\\"topPositiveReviewSnippets\\":['];

interface ComplaintCategory {
  slug: string;
  label: string;
}

interface ParsedComplaintProduct {
  name: string;
  complaints: string[];
}

const CATEGORIES: ComplaintCategory[] = [
  { slug: 'appointment-scheduling-software', label: 'appointment scheduling' },
  { slug: 'home-inspection-software', label: 'home inspection' },
  { slug: 'proposal-management-software', label: 'proposal management' },
  { slug: 'social-media-management-software', label: 'social media management' },
  { slug: 'product-information-management-software', label: 'product information management' },
];

function decodeJsonText(value: string): string {
  return value
    .replace(/\\u0026/g, '&')
    .replace(/\\u0027/g, "'")
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u2018|\\u2019/g, "'")
    .replace(/\\u201c|\\u201d/g, '"')
    .replace(/\\u2026/g, '...')
    .replace(/\\\//g, '/')
    .replace(/\\r\\n|\\n|\\r/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\t/g, ' ')
    .replace(/\\\\/g, '\\');
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractComplaintTexts(block: string): string[] {
  const complaints: string[] = [];

  for (const match of block.matchAll(REVIEW_TEXT_MATCHER)) {
    const decoded = normalizeWhitespace(decodeJsonText(match[1] ?? ''));
    if (!decoded || decoded.length < 30) continue;
    complaints.push(decoded);
  }

  return [...new Set(complaints)];
}

function parseComplaintProducts(html: string): ParsedComplaintProduct[] {
  const products: ParsedComplaintProduct[] = [];

  let searchIndex = 0;

  while (searchIndex < html.length) {
    const markerIndex = html.indexOf(NEGATIVE_REVIEW_MARKER, searchIndex);
    if (markerIndex === -1) break;

    const nameWindowStart = Math.max(0, markerIndex - 1200);
    const nameWindow = html.slice(nameWindowStart, markerIndex);
    const nameMatches = [...nameWindow.matchAll(NAME_MATCHER)];
    const rawName = nameMatches.at(-1)?.[1];

    const reviewBlockStart = markerIndex + NEGATIVE_REVIEW_MARKER.length;
    const endCandidates = POSITIVE_REVIEW_MARKERS
      .map(marker => html.indexOf(marker, reviewBlockStart))
      .filter(index => index !== -1);
    const reviewBlockEnd = endCandidates.length > 0 ? Math.min(...endCandidates) : -1;

    if (!rawName || reviewBlockEnd === -1) {
      searchIndex = reviewBlockStart;
      continue;
    }

    const name = normalizeWhitespace(decodeJsonText(rawName));
    const complaints = extractComplaintTexts(html.slice(reviewBlockStart, reviewBlockEnd));

    if (name && complaints.length > 0) {
      products.push({ name, complaints });
    }

    searchIndex = reviewBlockEnd;
  }

  return products;
}

function scoreFromComplaintDensity(complaintCount: number): number {
  // Complaint density is only a weak signal.
  // Mature categories often generate lots of complaints without creating a good wedge.
  return Math.max(4, Math.min(14, complaintCount * 3));
}

export async function fetchComplaintEcosystemPosts(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  const seen = new Set<string>();

  for (const category of CATEGORIES) {
    try {
      const url = `https://www.capterra.com/${category.slug}/`;
      const response = await axios.get<string>(url, {
        headers: FETCH_HEADERS,
        responseType: 'text',
        timeout: 15000,
      });

      const products = parseComplaintProducts(response.data).slice(0, 6);

      for (const product of products) {
        for (const complaint of product.complaints.slice(0, 2)) {
          const dedupeKey = `${category.slug}:${product.name}:${complaint}`;
          if (seen.has(dedupeKey)) continue;

          const enriched = enrichRawPost(
            {
              title: `${product.name} complaint in ${category.label}`,
              body: `Complaint-evidence signal from Capterra. Category: ${category.label}. Product: ${product.name}. Complaint snippet: ${complaint} Treat this as validation of incumbent weakness, pricing pain, UX friction, or missing-feature pain inside an existing software category — not as a standalone business idea by itself. Only promote if a narrow underserved user, repeated trigger, clear wedge, and believable small V1 can be inferred.`,
              url,
              platform: 'capterra',
              points: scoreFromComplaintDensity(product.complaints.length),
              comments: product.complaints.length,
            },
            {
              sourceLane: 'complaint_ecosystems',
              sourceName: 'capterra_category_reviews',
              sourcePriority: 'secondary',
            }
          );

          if (!enriched) continue;

          seen.add(dedupeKey);
          posts.push(enriched);
        }
      }
    } catch (err: any) {
      logger.warn('scout', `Complaint source failed [${category.slug}]: ${err?.message ?? err}`);
    }
  }

  logger.info('scout', `Complaint ecosystem source: ${posts.length} filtered posts from Capterra categories`);

  return posts;
}