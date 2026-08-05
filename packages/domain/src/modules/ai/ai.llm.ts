/**
 * Module 24 — Port LLM Provider-Agnostic.
 *
 * Les adaptateurs (OpenAI, Anthropic, Gemini, Azure OpenAI, Ollama, modèles open
 * source...) implémentent ce port. Le service métier ne connaît jamais le
 * fournisseur concret : il résout le fournisseur configuré par l'hôtel et
 * délègue. **Si aucun adaptateur/LLM n'est disponible, le service utilise des
 * réponses déterministes (rules) — l'IA n'est jamais une dépendance.**
 */
import type { AiProvider } from "./ai.types.js";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmCompleteOptions {
  temperature?: number;
  maxTokens?: number;
}

export type LlmResult = {
  text: string;
  providerRef?: string | null;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
};

export interface LlmClient {
  /** Clé métier du fournisseur (openai, anthropic, gemini, azure, ollama...). */
  readonly providerKey: string;
  /** Complète une conversation. Doit être sûr (lever → géré par le service). */
  complete(provider: AiProvider, messages: LlmMessage[], opts?: LlmCompleteOptions): Promise<LlmResult>;
}

/** Registre des clients LLM par providerKey (résolu dans l'infra). */
export type LlmRegistry = Record<string, LlmClient>;
