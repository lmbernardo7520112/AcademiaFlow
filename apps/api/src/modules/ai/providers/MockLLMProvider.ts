import type { AnyZodObject } from 'zod';
import type { ILLMProvider } from './ILLMProvider.js';

export class MockLLMProvider implements ILLMProvider {
  readonly providerName = 'mock';

  async generateStructuredData<T>(_prompt: string, _schema: AnyZodObject): Promise<T> {
    // Retorna um payload estático assinalando perfeitamente a AtividadeGeradaSchema
    // Protegendo o sistema contra gastos de tokens no CI/CD e nos testes TDD.
    return {
      tituloDaAtividade: '[TESTE Mock] Recuperação Direcionada',
      resumoPedagogico: 'Este é um teste unitário de pipeline B2B. Nenhuma API externa foi chamada.',
      pontosDeAtencao: ['Foco 1', 'Foco 2 simulado'],
      questoes: [
        {
          titulo: 'Questão Mock 1',
          enunciado: 'Quanto é 2 + 2 num ambiente de testes?',
          alternativas: ['1', '2', '3', '4'],
          correta: 3,
        }
      ]
    } as unknown as T;
  }
}
