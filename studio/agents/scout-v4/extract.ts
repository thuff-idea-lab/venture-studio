import { callLLM } from '../../lib/llm';
import { logger } from '../../lib/logger';
import type { RawSignal, ExtractedIdea, ProductShape } from './types';

const VALID_SHAPES: ProductShape[] = [
  'web_app', 'browser_extension', 'bot', 'api', 'template',
  'newsletter', 'data_product', 'widget', 'saas', 'directory',
  'calculator', 'automation', 'marketplace', 'community',
];

const EXTRACTION_PROMPT = `You are an opportunity researcher for a solo software builder.

Your job: given a raw signal (post, query, review, trend), determine if
there is a buildable, monetizable internet product opportunity.

FOUNDER CONTEXT
The founder is technically capable and enjoys building. They ship fast and solo.
They can build: web apps, mobile-friendly web tools, browser extensions,
bots (Discord/Slack/Telegram), APIs, templates and kits, newsletters,
data products, embeddable widgets, Chrome extensions, automation scripts,
directories, calculators, comparison tools, SaaS tools, or any combination.

They CANNOT build: hardware, native mobile apps (iOS/Android), anything
requiring regulatory approval (finance, healthcare, legal compliance),
anything needing a large team, anything requiring deep ML/AI research,
enterprise products requiring trust or sales teams.

They do NOT have niche preferences — any industry or audience is fair game
as long as the product is feasible, low-effort, and not highly regulated.

EVALUATE — ALL must be true to proceed:
1. There is a specific, nameable person (not a category) who has this problem regularly
2. The problem is concrete and recurring (not a one-time annoyance or thought experiment)
3. A useful V1 could be built by one person in under 40 hours
4. There is at least one realistic, specific way to reach the first 100 users
5. There is at least one plausible way this makes $100+/month within 6 months
6. The founder can build this without specialist expertise or regulatory compliance
7. Someone would realistically pay money for this — not just "want" it for free

AUTO-REJECT — return REJECT if any of these are true:
- the signal is generic news, trend commentary, or culture discussion
- no specific user can be named
- the problem requires regulatory, compliance, security, or medical expertise
- the problem requires deep infrastructure, kernel, distributed systems work
- building a useful V1 requires a large dataset that doesn't exist publicly
- the distribution path is vague ("SEO", "social media", "communities")
- the idea is a broad software category without a specific wedge
- the idea requires building a two-sided marketplace from scratch
- the product is notification/reminder-only (just sends messages) with no workflow, data, or decision-making value
- the idea is a generic wellness, motivation, or accountability tool (fitness reminders, habit nudges, motivational bots)
- the idea is a "feedback collection" or "complaint aggregation" tool with no clear paying customer
- the signal is someone complaining about a platform they want to LEAVE — tools for churning users have no long-term market
- the product is a "guide" or "how-to" that could be a free blog post or YouTube video instead of software
- the monetization boils down to "freemium" or "premium features" without naming what the user gets that's worth paying for

TITLE RULES:
- must be concrete, specific, and noun-heavy
- never use vague adjectives: "AI-Powered", "Smart", "Streamlined", "Automated", "Ultimate"
- should describe what the product IS, not how great it is
- good: "Appointment Reminder Bot for Dog Groomers"
- bad: "AI-Powered Scheduling Solution"

BUILD HOURS CALIBRATION — use these anchors:
- Spreadsheet/Notion template with formulas: 8-15 hours
- Static calculator or comparison page: 10-20 hours
- Simple CRUD web app (no auth, no payments): 15-25 hours
- Web app with auth + basic dashboard: 25-35 hours
- Chrome extension with DOM manipulation: 20-35 hours
- Bot (Discord/Slack/Telegram) with simple commands: 15-25 hours
- Web app with auth + payments + multi-user: 35-50 hours
- Chrome extension with video/media processing: 40-60 hours
- SaaS with integrations to external APIs: 35-55 hours
Pick the closest anchor. DO NOT default to 30 for everything.

MONETIZATION RULES:
- "monthly subscription" alone is not specific enough
- name the EXACT value exchange: what does the user get that's worth $X?
- one-time purchase, per-use fees, templates, consulting upsell — all valid
- do NOT default to "$5/month subscription for premium features"
- if you can't name a specific thing worth paying for, REJECT the idea

If the signal does NOT qualify, return only: REJECT

If it qualifies, return ONLY valid JSON (no markdown, no explanation):
{
  "title": "specific descriptive name",
  "product_shape": "web_app | browser_extension | bot | api | template | newsletter | data_product | widget | saas | directory | calculator | automation | marketplace | community",
  "target_user": "specific person — not a demographic, a person with a job or role",
  "pain": "what they do today that sucks — concrete, not abstract",
  "frequency": "how often they hit this pain (daily | weekly | monthly | per_transaction | per_project)",
  "v1_description": "smallest useful first version in 1-2 sentences",
  "monetization": "specific revenue path — name the exact value exchange, not just 'subscription'",
  "distribution": "specific path to first 100 users — name the community, channel, or outreach method",
  "why_now": "why this is actionable right now",
  "build_hours_estimate": 0,
  "confidence": "HIGH | MEDIUM | LOW"
}`;

/**
 * Extract a product idea from a raw signal using the LLM.
 * Returns the extracted idea, or null if the LLM rejects the signal.
 */
export async function extractIdea(signal: RawSignal): Promise<ExtractedIdea | null> {
  const signalText = [
    `[Source: ${signal.platform} | Strategy: ${signal.strategy}]`,
    `Title: ${signal.title}`,
    signal.body ? `Body: ${signal.body}` : '',
    `URL: ${signal.url}`,
  ]
    .filter(Boolean)
    .join('\n');

  // callLLM takes a single prompt string — combine system + user content
  const fullPrompt = `${EXTRACTION_PROMPT}\n\n---\n\nRAW SIGNAL:\n${signalText}`;

  try {
    const response = await callLLM(fullPrompt);
    const trimmed = response.trim();

    // Check for rejection
    if (trimmed === 'REJECT' || trimmed.startsWith('REJECT')) {
      return null;
    }

    // Parse JSON — handle cases where LLM wraps in markdown code blocks
    let jsonStr = trimmed;
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.title || !parsed.product_shape || !parsed.target_user || !parsed.pain) {
      logger.warn('scout-v4', `LLM returned incomplete idea for signal: ${signal.title}`);
      return null;
    }

    // Normalize product_shape
    if (!VALID_SHAPES.includes(parsed.product_shape)) {
      parsed.product_shape = 'web_app';
    }

    // Normalize confidence
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(parsed.confidence)) {
      parsed.confidence = 'LOW';
    }

    // Normalize build_hours_estimate
    if (typeof parsed.build_hours_estimate !== 'number' || parsed.build_hours_estimate <= 0) {
      parsed.build_hours_estimate = 20;
    }

    return parsed as ExtractedIdea;
  } catch (err: any) {
    logger.warn('scout-v4', `Extraction failed for "${signal.title}": ${err.message}`);
    return null;
  }
}
