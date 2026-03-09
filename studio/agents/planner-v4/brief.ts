// ── BRIEF.md Generator ────────────────────────────────────────────────────────
// Assembles the "what and why" overview from DB data. No LLM call.

import type { PlannerInput } from './types';

export function generateBrief(input: PlannerInput): string {
  const { idea, evaluation } = input;
  const vd = idea.validation_data ?? {};

  const demandSection = buildDemandSection(vd.demand);
  const competitionSection = buildCompetitionSection(vd.competition);
  const trendSection = buildTrendSection(vd.trend);
  const sourcesSection = buildSourcesSection(idea.sources);

  return `# ${idea.title}

> ${idea.summary}

---

## The Problem

${idea.pain}

## Who Has This Problem

**Target User:** ${idea.target_user}

**How often:** ${idea.frequency || 'Unknown'}

**Current workaround:** ${idea.v1_description || 'None identified'}

## Evidence This Is Real

### Demand Signals
${demandSection}

### Competition Landscape
${competitionSection}

### Trend Direction
${trendSection}

### Discovery Source
- **Strategy:** ${idea.strategy}
${sourcesSection}

## Evaluator Verdict

| Dimension | Score |
|-----------|-------|
| Problem Clarity | ${evaluation.score_problem_clarity}/10 |
| Target User | ${evaluation.score_target_user}/10 |
| Build Feasibility | ${evaluation.score_build_feasibility}/10 |
| Revenue Path | ${evaluation.score_revenue_path}/10 |
| Distribution | ${evaluation.score_distribution}/10 |
| Timing | ${evaluation.score_timing}/10 |
| **Raw Score** | **${evaluation.score_raw}** |
| Validation Modifier | ${evaluation.validation_modifier > 0 ? '+' : ''}${evaluation.validation_modifier} |
| **Final Score** | **${evaluation.score_final}** |
| **Recommendation** | **${evaluation.recommendation}** |

### Strengths
${(evaluation.strengths || []).map(s => `- ${s}`).join('\n')}

### Risks
${(evaluation.risks || []).map(r => `- ${r}`).join('\n')}

### Reasoning
${evaluation.reasoning}

## How It Makes Money

**Monetization:** ${idea.monetization}

**Product Shape:** ${idea.product_shape}

**Build Estimate:** ${idea.build_hours_estimate} hours

## Why Now

${idea.why_now || 'No specific timing signal identified.'}

## Confidence

**${idea.confidence}**
`;
}

function buildDemandSection(demand?: { autocomplete_match: boolean; related_completions: string[] }): string {
  if (!demand) return '- No demand data collected';
  const lines: string[] = [];
  lines.push(`- **Autocomplete match:** ${demand.autocomplete_match ? 'Yes — people are searching for this' : 'No — not appearing in search suggestions'}`);
  if (demand.related_completions?.length > 0) {
    lines.push(`- **Related searches:** ${demand.related_completions.join(', ')}`);
  }
  return lines.join('\n');
}

function buildCompetitionSection(competition?: { competition_level: string; top_results_summary: string[] }): string {
  if (!competition) return '- No competition data collected';
  const lines: string[] = [];
  lines.push(`- **Competition level:** ${competition.competition_level}`);
  if (competition.top_results_summary?.length > 0) {
    lines.push('- **Top existing results:**');
    competition.top_results_summary.forEach(r => lines.push(`  - ${r}`));
  }
  return lines.join('\n');
}

function buildTrendSection(trend?: { trend: string; interest_score?: number }): string {
  if (!trend) return '- No trend data collected';
  const lines: string[] = [];
  lines.push(`- **Direction:** ${trend.trend}`);
  if (trend.interest_score !== undefined) {
    lines.push(`- **Interest score:** ${trend.interest_score}`);
  }
  return lines.join('\n');
}

function buildSourcesSection(sources?: { platform: string; url: string; strategy: string }[]): string {
  if (!sources || sources.length === 0) return '';
  return sources.map(s => `- ${s.platform}: ${s.url}`).join('\n');
}
