// ── SPEC.md Generator ─────────────────────────────────────────────────────────
// LLM-generated technical spec: data model, routes, flows, file structure, etc.

import { callLLM } from '../../lib/llm';
import type { PlannerInput } from './types';

export async function generateSpec(input: PlannerInput): Promise<string> {
  const { idea, evaluation } = input;

  const prompt = `You are a senior full-stack engineer writing a technical specification for a solo developer (or AI coding agent) to build an MVP.

The spec must be detailed enough that a developer can build the entire V1 WITHOUT inventing any missing requirements. Every decision should be made in this document.

PRODUCT CONTEXT:
- Title: ${idea.title}
- Summary: ${idea.summary}
- Target User: ${idea.target_user}
- Problem: ${idea.pain}
- Product Shape: ${idea.product_shape}
- Monetization: ${idea.monetization}
- Build Estimate: ${idea.build_hours_estimate} hours
- Distribution: ${idea.distribution}
- Why Now: ${idea.why_now}
- Evaluator Score: ${evaluation.score_final}/100
- Strengths: ${(evaluation.strengths || []).join('; ')}
- Risks: ${(evaluation.risks || []).join('; ')}

Write the technical specification in markdown format with EXACTLY these sections:

## 1. Product Overview
One paragraph: what this is, who it's for, and what problem it solves.

## 2. Tech Stack
Choose the right tools for THIS specific product. Don't default to the same stack every time. Justify each choice in one line.
- Framework (Next.js, Astro, plain HTML, etc.)
- Styling (Tailwind, CSS modules, etc.)
- Database (Supabase, SQLite, JSON files, localStorage, none, etc.)
- Hosting (Vercel, Cloudflare Pages, etc.)
- Payment processor (if monetized — Stripe, Lemon Squeezy, Gumroad, etc.)
- Any external APIs or data sources

## 3. Data Model
Define every entity as a TypeScript interface. Include all fields with types. For example:
\`\`\`typescript
interface Quote {
  id: string;
  clientName: string;
  amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  createdAt: Date;
  expiresAt: Date;
}
\`\`\`

## 4. Page/Route Map
List every page/route in the app with:
- Path (e.g., \`/quotes\`)
- Purpose (one sentence)
- Key components on the page

## 5. Core User Flows
Describe the primary user flows step-by-step. For each flow:
1. User action → System response → What the user sees
2. Include edge cases and error states

## 6. API/Integration Contracts
If the product calls any external APIs or services, specify:
- Endpoint URL pattern
- Authentication method
- Request/response data shapes
- Rate limits or costs to be aware of

If no external APIs, write "No external API integrations required for V1."

## 7. Monetization Integration
Describe exactly WHERE and HOW money changes hands:
- What is free vs. paid?
- Where does the paywall/checkout appear in the user flow?
- What payment provider and integration approach?
- What happens after payment (unlock, download, redirect)?

If the V1 is free to validate demand, say so explicitly and describe what the future paid gate would be.

## 8. Data Seeding
What content or data does the product need on day 1 to not feel empty?
- What specific data is needed?
- Where does it come from? (manual entry, scrape, API, public dataset)
- Exact format/schema of the seed data
- How much is needed for a credible V1?

If no seeding needed (e.g., user brings their own data), say so.

## 9. File Structure
Suggest the project file structure:
\`\`\`
project-root/
  src/
    app/         — pages and routes
    components/  — reusable UI components
    lib/         — utilities and helpers
    ...
\`\`\`

## 10. V1 Scope Boundary
Two lists:
**BUILD (must have for V1):**
- Feature 1
- Feature 2
- ...

**DO NOT BUILD (explicitly out of scope):**
- Feature A — why it's excluded
- Feature B — why it's excluded

Be specific. "No authentication" is better than "keep it simple."

Do NOT wrap the entire output in a code block. Write it as clean markdown.`;

  const response = await callLLM(prompt, { temperature: 0.3 });
  return cleanMarkdownResponse(response);
}

function cleanMarkdownResponse(response: string): string {
  let cleaned = response.trim();
  // Strip wrapping code fences if the LLM wrapped the whole thing
  if (cleaned.startsWith('```markdown')) {
    cleaned = cleaned.slice('```markdown'.length);
  } else if (cleaned.startsWith('```md')) {
    cleaned = cleaned.slice('```md'.length);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}
