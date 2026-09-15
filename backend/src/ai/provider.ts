import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { logger } from '../utils/logger';

// ─── Provider Types ────────────────────────────────────────────────────────────
export type AIProvider = 'claude' | 'openai' | 'groq' | 'keyword_fallback';

interface ProviderStatus {
  claude: boolean;
  openai: boolean;
  groq: boolean;
}

// ─── Provider State ────────────────────────────────────────────────────────────
const providerStatus: ProviderStatus = {
  claude: !!process.env.CLAUDE_API_KEY,
  openai: !!process.env.OPENAI_API_KEY,
  groq: !!process.env.GROQ_API_KEY,
};

let activeProvider: AIProvider = 'keyword_fallback';

// ─── Client Singletons ─────────────────────────────────────────────────────────
let claudeClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;
let groqClient: Groq | null = null;

if (providerStatus.claude) {
  claudeClient = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
}
if (providerStatus.openai) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
if (providerStatus.groq) {
  groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// Groq free-tier model options (in order of preference — verified working 2026-09)
const GROQ_MODELS = [
  'qwen/qwen3.8-27b',       // Qwen 27B — fast, free tier
  'groq/compound-mini',     // Groq's own model
  'openai/gpt-oss-20b',    // GPT OSS 20B on Groq
  'allam-2-7b',             // Allam 7B — Arabic/English
];

let activeGroqModel = GROQ_MODELS[0];

export function getGroqModel(): string {
  return activeGroqModel;
}

// ─── Startup: Auto-detect best available provider ─────────────────────────────
export async function detectBestProvider(): Promise<void> {
  logger.info('🔍 Detecting best available AI provider...');

  // Try Groq FIRST (free tier, no credit needed)
  if (groqClient) {
    for (const model of GROQ_MODELS) {
      try {
        await groqClient.chat.completions.create({
          model,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'hi' }],
        });
        activeProvider = 'groq';
        activeGroqModel = model;
        logger.info(`✅ AI Provider: Groq (${model}) — FREE TIER`);
        return;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('model_not_found') || errMsg.includes('does not exist')) {
          logger.warn(`⚠️  Groq model ${model} not available, trying next...`);
          continue;
        }
        // Other errors (rate limit, etc.) — Groq key works, just set it active
        activeProvider = 'groq';
        activeGroqModel = model;
        logger.info(`✅ AI Provider: Groq (${model}) — key valid, using this provider`);
        return;
      }
    }
    logger.warn('⚠️  No Groq models available, trying Claude...');
  }

  // Try Claude
  if (claudeClient) {
    try {
      await claudeClient.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'hi' }],
      });
      activeProvider = 'claude';
      logger.info('✅ AI Provider: Claude (claude-sonnet-4-5)');
      return;
    } catch (err) {
      logger.warn('⚠️  Claude unavailable, trying OpenAI...', { err });
    }
  }

  // Try OpenAI
  if (openaiClient) {
    try {
      await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'hi' }],
      });
      activeProvider = 'openai';
      logger.info('✅ AI Provider: OpenAI (gpt-4o-mini)');
      return;
    } catch (err) {
      logger.warn('⚠️  OpenAI unavailable', { err });
    }
  }

  activeProvider = 'keyword_fallback';
  logger.warn('⚠️  All AI providers failed. Using keyword fallback mode.');
}

export function getActiveProvider(): AIProvider {
  return activeProvider;
}

// ─── Core: Chat Completion (with auto-fallback chain) ─────────────────────────
interface ChatCompletionOptions {
  system: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

export async function chatCompletion(opts: ChatCompletionOptions): Promise<string> {
  const { system, userMessage, maxTokens = 1024, temperature = 0.3 } = opts;

  // Try Groq FIRST (free tier)
  if (groqClient && (activeProvider === 'groq' || activeProvider === 'keyword_fallback')) {
    try {
      const response = await groqClient.chat.completions.create({
        model: activeGroqModel,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage },
        ],
      });
      return response.choices[0]?.message?.content ?? '';
    } catch (err) {
      logger.warn('Groq failed, trying Claude...', { err });
    }
  }

  // Try Claude
  if (claudeClient) {
    try {
      const response = await claudeClient.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: `<user_input>${userMessage}</user_input>` }],
      });
      const content = response.content[0];
      if (content.type === 'text') return content.text;
      throw new Error('Unexpected response type from Claude');
    } catch (err) {
      logger.warn('Claude failed, trying OpenAI...', { err });
    }
  }

  // Try OpenAI
  if (openaiClient) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage },
        ],
      });
      return response.choices[0]?.message?.content ?? '';
    } catch (err) {
      logger.warn('OpenAI failed — all paid providers exhausted', { err });
    }
  }

  // Keyword fallback — caller handles null
  throw new Error('ALL_PROVIDERS_FAILED');
}

// ─── Embeddings (OpenAI → Groq text embedding alternative → null) ─────────────
export async function generateEmbedding(text: string): Promise<number[] | null> {
  // Try OpenAI embeddings first (best quality)
  if (openaiClient) {
    try {
      const response = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000), // hard limit
      });
      return response.data[0].embedding;
    } catch (err) {
      logger.warn('OpenAI embedding failed, trying Groq compatible...', { err });
    }
  }

  // Groq doesn't have a dedicated embedding API yet — use OpenAI compatible endpoint via Groq base
  // Fallback: return null (duplicate detection will be skipped gracefully)
  logger.warn('⚠️  Embedding unavailable — duplicate detection disabled for this request');
  return null;
}

// ─── Input Sanitization (always run before passing to AI) ─────────────────────
export function sanitizeInput(text: string): string {
  return text
    .replace(/ignore previous instructions/gi, '')
    .replace(/you are now/gi, '')
    .replace(/system:/gi, '')
    .replace(/<\/?system>/gi, '')
    .replace(/\[INST\]/gi, '')
    .slice(0, 2000);
}
