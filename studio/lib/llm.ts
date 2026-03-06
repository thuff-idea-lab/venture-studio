import * as dotenv from 'dotenv';
dotenv.config();

// ── Types ─────────────────────────────────────────────────────────────────────

export type LLMProvider = 'github' | 'anthropic' | 'ollama';

export interface LLMOptions {
  model?: string;
  temperature?: number;
  provider?: LLMProvider;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Single entry point for all LLM calls in the studio.
 * Never call an AI API directly from an agent — always use this.
 * Swap providers by setting LLM_PROVIDER in .env.
 */
export async function callLLM(
  prompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const provider = options.provider
    ?? (process.env.LLM_PROVIDER as LLMProvider)
    ?? 'github';

  switch (provider) {
    case 'github':    return callGitHubModels(prompt, options);
    case 'anthropic': return callClaude(prompt, options);
    case 'ollama':    return callOllama(prompt, options);
    default:          throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

async function callGitHubModels(prompt: string, options: LLMOptions): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set in .env');

  const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model ?? 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub Models API error ${res.status}: ${err}`);
  }

  const data = await res.json() as any;
  return data.choices[0].message.content;
}

async function callClaude(_prompt: string, _options: LLMOptions): Promise<string> {
  // TODO: implement when needed
  // npm install @anthropic-ai/sdk
  throw new Error('Anthropic provider not configured yet. Set LLM_PROVIDER=github in .env');
}

async function callOllama(prompt: string, options: LLMOptions): Promise<string> {
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model ?? 'llama3.2',
      prompt,
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json() as any;
  return data.response;
}
