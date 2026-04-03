import { GoogleGenAI, Type } from '@google/genai';
import type { Schema } from '@google/genai';
import type { AnyZodObject } from 'zod';
import type { ILLMProvider } from './ILLMProvider.js';

export class GeminiProvider implements ILLMProvider {
  readonly providerName = 'gemini';
  private ai: GoogleGenAI;
  private readonly MODEL_NAME = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

    if (!apiKey && !isTest) {
      throw new Error('Variável de ambiente GEMINI_API_KEY não foi configurada.');
    }

    this.ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-testing' });
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
    const response = await this.ai.models.generateContent({
      model: this.MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: this.buildGeminiSchemaValidation(),
        // Configuração de temperatura focada para exatidão e formato pedagógico adequado
        temperature: 0.2, 
      },
    });

    const textPayload = response.text;
    if (!textPayload) {
      throw new Error('A API remota (Google Gemini) retornou uma resposta vazia.');
    }

    // O JSON.parse transforma a string em objeto e o zodSchema valida imediatamente!
    let parsed: unknown;
    try {
        parsed = JSON.parse(textPayload);
    } catch {
        throw new Error('A API do GenAI não retornou um JSON válido que possa sofre parse.');
    }
    
    const validatedData = schema.parse(parsed);
    return validatedData as T;
  }

  async generateText(prompt: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: this.MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.7, // Higher temperature for more creative/analytical output
      },
    });

    const textPayload = response.text;
    if (!textPayload) {
      throw new Error('A API remota (Google Gemini) retornou uma resposta vazia.');
    }

    return textPayload;
  }
}
