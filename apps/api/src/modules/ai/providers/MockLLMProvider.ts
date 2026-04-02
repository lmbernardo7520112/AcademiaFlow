import type { AnyZodObject } from 'zod';
import type { ILLMProvider } from './ILLMProvider.js';

export class MockLLMProvider implements ILLMProvider {
  readonly providerName = 'mock';

  async generateStructuredData<T>(prompt: string, _schema: AnyZodObject): Promise<T> {
    console.log('[MockLLM] Generating structured data for:', prompt);
    // Mock response following the schema roughly
    const mockData = {
      tituloDaAtividade: 'Atividade Mock',
      resumoPedagogico: 'Resumo de teste',
      pontosDeAtencao: ['Ponto A', 'Ponto B'],
      questoes: [
        {
          titulo: 'Questao 1',
          enunciado: 'Enunciado de teste',
          alternativas: ['A', 'B', 'C', 'D'],
          correta: 0
        }
      ]
    };
    return mockData as T;
  }

  async generateText(prompt: string): Promise<string> {
    console.log('[MockLLM] Generating text for:', prompt);
    return 'Esta é uma análise pedagógica gerada pelo MockLLM para fins de teste.';
  }
}
