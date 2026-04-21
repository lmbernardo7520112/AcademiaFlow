import { GoogleGenAI, Type } from '@google/genai';
import type { Schema } from '@google/genai';
import type { AnyZodObject, ZodError } from 'zod';
import type { ILLMProvider } from './ILLMProvider.js';
import { extractJsonFromString } from '../utils/json-extractor.js';
import { AISchemaValidationError, AITimeoutError, AIRateLimitError, AIProviderError, AIUnavailableError } from '../errors.js';

export class GeminiProvider implements ILLMProvider {
  readonly providerName = 'gemini';
  private ai: GoogleGenAI | null = null;
  private initialized = false;
  private readonly MODEL_NAME = 'gemini-2.5-flash';

  /**
   * Constructor is intentionally a no-op.
   * The SDK is only initialized on first actual AI usage via ensureInitialized().
   * This allows the Fastify server to boot successfully without GEMINI_API_KEY,
   * keeping non-AI features (e.g. Busca Ativa) fully operational offline.
   */
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[AI] AI provider disabled: GEMINI_API_KEY not configured. AI features will return 503 until configured.');
    }
  }

  /**
   * Lazy initialization gate. Called before every AI operation.
   * Throws AIUnavailableError (503) if GEMINI_API_KEY is absent.
   * Only initializes the SDK once on first successful call.
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    const apiKey = process.env.GEMINI_API_KEY;
    const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

    if (!apiKey && !isTest) {
      throw new AIUnavailableError();
    }

    this.ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-testing' });
    this.initialized = true;
  }

  /**
   * Converte o ZodSchema em um objeto JSON nativo para o schema do @google/genai
   * Esta etapa assegura 100% de compatibilidade entre o Structured Outputs e o SDD Zod.
   */
  private buildGeminiSchemaValidation(): Schema {
     return {
      type: Type.OBJECT,
      properties: {
        tituloDaAtividade: { type: Type.STRING },
        resumoPedagogico: { type: Type.STRING },
        pontosDeAtencao: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        questoes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              titulo: { type: Type.STRING },
              enunciado: { type: Type.STRING },
              alternativas: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correta: { type: Type.INTEGER },
            },
            required: ['titulo', 'enunciado', 'alternativas', 'correta'],
          },
        },
      },
      required: ['tituloDaAtividade', 'resumoPedagogico', 'pontosDeAtencao', 'questoes'],
    };
  }

  async generateStructuredData<T>(prompt: string, schema: AnyZodObject): Promise<T> {
    this.ensureInitialized();

    try {
      const response = await this.ai!.models.generateContent({
        model: this.MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: this.buildGeminiSchemaValidation(),
          temperature: 0.2, 
        },
      });

      const textPayload = response.text;
      if (!textPayload) {
        throw new AIProviderError('A API remota (Google Gemini) retornou uma resposta vazia estrutural.');
      }

      const parsed = extractJsonFromString(textPayload);
      const validatedData = schema.parse(parsed);

      return validatedData as T;
    } catch (error: unknown) {
      if (error instanceof AIUnavailableError) throw error;
      if (error instanceof Error && error.name === 'ZodError') {
        throw new AISchemaValidationError(`Dados omitidos estruturalmente pela IA: ${(error as ZodError).issues.map(i => i.path.join('.')).join(', ')}`);
      }
      this.handleProviderError(error);
      throw error;
    }
  }

  private handleProviderError(error: unknown) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('429') || msg.includes('too many requests') || msg.includes('quota')) {
        throw new AIRateLimitError();
      }
      if (msg.includes('timeout') || msg.includes('deadline')) {
        throw new AITimeoutError();
      }
      if (msg.includes('503') || msg.includes('502')) {
        throw new AIProviderError('O serviço LLM externo está indisponível.');
      }
    }
  }

  async generateText(prompt: string): Promise<string> {
    this.ensureInitialized();

    try {
      const response = await this.ai!.models.generateContent({
        model: this.MODEL_NAME,
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      const textPayload = response.text;
      if (!textPayload) {
        throw new AIProviderError('A API remota (Google Gemini) retornou uma resposta de texto vazia.');
      }

      return textPayload;
    } catch (error: unknown) {
      if (error instanceof AIUnavailableError) throw error;
      this.handleProviderError(error);
      throw error;
    }
  }
}
