import { describe, it, expect } from 'vitest';
import { analyzeStudentPayloadSchema, atividadeGeradaSchema, questaoSchema } from './ai.js';

describe('analyzeStudentPayloadSchema', () => {
  it('should accept valid payload with alunoId and focoAtividade', () => {
    const payload = {
      alunoId: '507f1f77bcf86cd799439011',
      focoAtividade: 'reforco-matematica',
    };
    const result = analyzeStudentPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should reject payload with invalid alunoId', () => {
    const payload = {
      alunoId: 'invalid-id',
      focoAtividade: 'reforco-matematica',
    };
    expect(analyzeStudentPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it('should reject payload with empty focoAtividade', () => {
    const payload = {
      alunoId: '507f1f77bcf86cd799439011',
      focoAtividade: '',
    };
    expect(analyzeStudentPayloadSchema.safeParse(payload).success).toBe(false);
  });
});

describe('questaoSchema', () => {
  it('should accept a valid question object', () => {
    const questao = {
      titulo: 'Questão de Revisão',
      enunciado: 'Quanto é 2 + 2?',
      alternativas: ['2', '3', '4', '5'],
      correta: 2,
    };
    const result = questaoSchema.safeParse(questao);
    expect(result.success).toBe(true);
  });

  it('should reject question with correta out of range', () => {
    const questao = {
      titulo: 'Teste',
      enunciado: 'Enunciado',
      alternativas: ['A', 'B'],
      correta: 5, // max is 4
    };
    expect(questaoSchema.safeParse(questao).success).toBe(false);
  });

  it('should reject question with less than 2 alternatives', () => {
    const questao = {
      titulo: 'Teste',
      enunciado: 'Enunciado',
      alternativas: ['Apenas uma'],
      correta: 0,
    };
    expect(questaoSchema.safeParse(questao).success).toBe(false);
  });
});

describe('atividadeGeradaSchema', () => {
  it('should accept a valid generated activity', () => {
    const atividade = {
      tituloDaAtividade: 'Recuperação Direcionada',
      resumoPedagogico: 'Diagnóstico de lacunas em Matemática Básica.',
      pontosDeAtencao: ['Foco 1 - Restauração', 'Foco 2 - Revisão Espacial'],
      questoes: [
        {
          titulo: 'Questão 1',
          enunciado: 'Quanto é 7 x 8?',
          alternativas: ['54', '55', '56', '57'],
          correta: 2,
        },
      ],
    };
    const result = atividadeGeradaSchema.safeParse(atividade);
    expect(result.success).toBe(true);
  });

  it('should reject activity without questoes', () => {
    const atividade = {
      tituloDaAtividade: 'Incompleta',
      resumoPedagogico: 'Sem questões.',
      pontosDeAtencao: ['Foco'],
      questoes: [], // min 1 required
    };
    expect(atividadeGeradaSchema.safeParse(atividade).success).toBe(false);
  });

  it('should reject activity with empty tituloDaAtividade', () => {
    const atividade = {
      tituloDaAtividade: '',
      resumoPedagogico: 'Resumo',
      pontosDeAtencao: ['Foco'],
      questoes: [
        {
          titulo: 'Q1',
          enunciado: 'E1',
          alternativas: ['A', 'B'],
          correta: 0,
        },
      ],
    };
    expect(atividadeGeradaSchema.safeParse(atividade).success).toBe(false);
  });
});
