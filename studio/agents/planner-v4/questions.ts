// ── QUESTIONS.md Generator ────────────────────────────────────────────────────
// LLM-generated founder questions to answer BEFORE the build starts.

import { callLLM } from '../../lib/llm';
import type { PlannerInput } from './types';

export async function generateQuestions(input: PlannerInput): Promise<string> {
  const { idea, evaluation } = input;

  const prompt = `You are a technical project manager preparing a build kickoff for a solo founder. The founder will hand the technical spec to an AI coding agent (like GitHub Copilot) and tell it to build the product. Before that happens, you need to surface every decision the founder must make — things the coding agent can't decide on its own.

PRODUCT CONTEXT:
- Title: ${idea.title}
- Summary: ${idea.summary}
- Target User: ${idea.target_user}
- Product Shape: ${idea.product_shape}
- Monetization: ${idea.monetization}
- Build Estimate: ${idea.build_hours_estimate} hours
- Distribution: ${idea.distribution}

RULES:
- Only ask questions that ACTUALLY affect what gets built. Not philosophical questions.
- Group questions by category.
- For each question, explain WHY it matters and suggest a default answer the founder can just accept if they don't have a strong opinion.
- Keep the total to 8-15 questions. Too many = overwhelming. Too few = gaps during build.
- Do NOT ask about tech stack — that's decided in the spec.
- DO ask about business decisions, content, accounts, domains, and product behavior.

Write the questions document in markdown format:

# Pre-Build Questions for ${idea.title}

Answer these questions before handing the spec to your coding agent. For each question, a suggested default is provided — accept it or override it.

## Branding & Identity
- Questions about name, domain, logo, tagline

## Product Behavior
- Questions about specific features, edge cases, and UX decisions that could go either way

## Monetization Setup
- Questions about payment accounts, pricing decisions, free vs paid boundaries

## Content & Data
- Questions about initial content, copy, seed data sources

## Accounts & Services
- Questions about third-party accounts the founder needs to set up (Stripe, analytics, email provider, etc.)

For each question, format as:
### [Question]
**Why it matters:** [one sentence]
**Suggested default:** [a reasonable default they can just accept]

Do NOT wrap the entire output in a code block. Write it as clean markdown.`;

  const response = await callLLM(prompt, { temperature: 0.3 });
  return cleanMarkdownResponse(response);
}

function cleanMarkdownResponse(response: string): string {
  let cleaned = response.trim();
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
