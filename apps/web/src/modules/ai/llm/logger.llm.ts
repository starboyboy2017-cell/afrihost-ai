/**
 * Module 24 — Adaptateur LLM de démonstration (provider-agnostic).
 *
 * Implémente le port `LlmClient`. En production, des adaptateurs OpenAI /
 * Anthropic / Gemini / Azure OpenAI / Ollama / open source implémenteraient
 * exactement la même interface — le service métier n'est jamais modifié.
 *
 * Ici : retourne un texte prévisible (pas de vrai LLM) pour la démo hors-ligne,
 * en simulant latence et compteurs de tokens.
 */
import type { AiProvider, LlmClient, LlmMessage, LlmResult } from "@afrihost/domain";

export class LoggerLlm implements LlmClient {
  readonly providerKey: string;

  constructor(providerKey: string) {
    this.providerKey = providerKey;
  }

  async complete(provider: AiProvider, messages: LlmMessage[]): Promise<LlmResult> {
    const userMsg = messages.find((m) => m.role === "user")?.content ?? "";
    const start = Date.now();
    // eslint-disable-next-line no-console
    console.log(`[ai:${this.providerKey}] ${provider.name} :: ${userMsg.slice(0, 120)}`);
    const text = `[démo ${this.providerKey}] Réponse générée pour : ${userMsg}`;
    return { text, providerRef: `llm-${this.providerKey}-${Date.now()}`, tokensIn: userMsg.length, tokensOut: text.length, latencyMs: Date.now() - start };
  }
}
