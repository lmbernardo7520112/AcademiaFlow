import { describe, it, expect } from 'vitest';
import { generateAtividadePayloadSchema, validacaoPedagogicaSchema } from './ai.js';

describe('generateAtividadePayloadSchema', () => {
  it('should accept valid criteria for activity generation', () => {
    const payload = {
      disciplinaId: '507f1f77bcf86cd799439011',
      topic: 'Equações de 2º Grau',
      objective: 'Resolver raízes reais usando Bhaskara.',
    };
    const result = generateAtividadePayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if(result.success) {
        expect(result.data.difficulty).toBe('medium');
    }
  });
});

describe('validacaoPedagogicaSchema', () => {
  it('should accept a valid AI evaluation form', () => {
    const payload = {
      adequacaoTopic: 10,
      clareza: 8.5,
      adequacaoIdade: 9,
      feedback: 'Muito bom, porém falta exercícios visuais.',
      isAprovado: true,
    };
    expect(validacaoPedagogicaSchema.safeParse(payload).success).toBe(true);
  });

  it('should reject scores over 10', () => {
    const payload = {
      adequacaoTopic: 11,
      clareza: 8.5,
      adequacaoIdade: 9,
      feedback: 'Invalido',
      isAprovado: true,
    };
    expect(validacaoPedagogicaSchema.safeParse(payload).success).toBe(false);
  });
});
