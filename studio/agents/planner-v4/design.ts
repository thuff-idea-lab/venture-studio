// ── DESIGN.md Generator ───────────────────────────────────────────────────────
// LLM-generated UI design system: colors, typography, layout, components, vibe.

import { callLLM } from '../../lib/llm';
import type { PlannerInput } from './types';

export async function generateDesign(input: PlannerInput): Promise<string> {
  const { idea, evaluation } = input;

  const prompt = `You are a UI/UX designer creating a design system document for a solo developer building an MVP. The developer will use this document to make every visual decision without needing a Figma file.

PRODUCT CONTEXT:
- Title: ${idea.title}
- Summary: ${idea.summary}
- Target User: ${idea.target_user}
- Product Shape: ${idea.product_shape}
- Problem: ${idea.pain}
- Monetization: ${idea.monetization}

DESIGN RULES:
- The visual style must match the TARGET USER and product type. A tool for freelancers looks different from a tool for bar managers or nurses.
- Choose a style that builds trust with this specific audience.
- Be specific with hex codes, font names, spacing values — not vague descriptions.
- Reference real websites or products the developer can look at for inspiration.
- Describe every key screen's layout in enough detail that the developer knows what goes where.

Write the design system in markdown format with EXACTLY these sections:

## 1. Visual Direction
One paragraph describing the overall look and feel. Use specific adjectives: clean, warm, bold, minimal, playful, professional, technical, friendly, etc. Explain WHY this style fits the target user.

## 2. Color Palette
Define the full palette with hex codes and usage:
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | ... | #... | Buttons, links, key actions |
| Secondary | ... | #... | Secondary actions, accents |
| Background | ... | #... | Page background |
| Surface | ... | #... | Cards, panels |
| Text Primary | ... | #... | Headings, body text |
| Text Secondary | ... | #... | Labels, captions |
| Success | ... | #... | Positive states |
| Warning | ... | #... | Caution states |
| Error | ... | #... | Error states |
| Border | ... | #... | Dividers, input borders |

## 3. Typography
- **Heading font:** Name + where to get it (Google Fonts, system, etc.)
- **Body font:** Name + where to get it
- **Mono font (if needed):** Name
- Size scale: h1, h2, h3, body, small, caption with px/rem values
- Font weights used: regular, medium, semibold, bold

## 4. Layout Pattern
Describe the overall page structure:
- Is it a single-page app, multi-page with nav, dashboard with sidebar, wizard flow, landing page + tool?
- Max content width
- Spacing system (base unit, common gaps)
- Responsive approach (mobile-first? breakpoints?)

## 5. Component Library
Recommend specific components from shadcn/ui or Tailwind UI patterns. List each component needed:
- Component name
- Where it's used
- Any customization notes

## 6. Key Screens
Describe the layout of every major screen. For each screen:
- **Screen name and URL path**
- **Layout description:** What's at the top, middle, bottom. What's in the sidebar (if any). Where the CTA goes.
- **Key elements:** List every UI element on the screen and roughly where it goes.
- **Empty state:** What the user sees before they've added any data.

## 7. Reference Sites
List 2-4 real websites or products that capture the intended look and feel. For each:
- URL
- What to take from it (layout? color approach? typography? density?)

Do NOT wrap the entire output in a code block. Write it as clean markdown.`;

  const response = await callLLM(prompt, { temperature: 0.4 });
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
