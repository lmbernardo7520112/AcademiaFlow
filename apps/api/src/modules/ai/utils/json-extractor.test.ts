import { describe, it, expect } from 'vitest';
import { extractJsonFromString } from './json-extractor.js';
import { UnparseableContentError } from '../errors.js';

describe('JSON Extractor Utility (Deterministic Fixtures)', () => {
  it('Fixture A: Padrão ideal com Markdown Fences (```json)', () => {
    const input = "```json\n{\"foo\":\"bar\"}\n```";
    const result = extractJsonFromString(input);
    expect(result).toEqual({ foo: 'bar' });
  });

  it('Fixture B: Markdown desnutrido e sem tipo (```)', () => {
    const input = "```\n[{\"foo\":\"bar\"}]\n```";
    const result = extractJsonFromString(input);
    expect(result).toEqual([{ foo: 'bar' }]);
  });

  it('Fixture C: Introdução tagarela antes do Fenced Block', () => {
    const input = `Aqui estão os exercícios que você pediu:
    
    \`\`\`json
    {"status":"ok"}
    \`\`\`
    
    Espero ter ajudado!`;
    const result = extractJsonFromString(input);
    expect(result).toEqual({ status: 'ok' });
  });

  it('Fixture D: JSON purista (Sem markdown e sem preâmbulos)', () => {
    const input = `{"key": "value"}`;
    const result = extractJsonFromString(input);
    expect(result).toEqual({ key: 'value' });
  });

  it('Fixture Fallback 1: Preâmbulo solto sem Fenced Block usando JSON primitivo balanceado', () => {
    const input = `Claro, aqui está a lista:
    [
      { "n": 1 }
    ]
    E mais nada.`;
    const result = extractJsonFromString(input);
    expect(result).toEqual([{ n: 1 }]);
  });

  it('Fixture Escapes: Ignora delimitadores literais encapsulados dentro de Strings', () => {
    const input = `O resultado é:
    {
      "texto": "uma chave com { ou [ que não deveria quebrar] o parser",
      "texto2": "escapado \\" [ e } ignorar"
    }`;
    const result = extractJsonFromString(input);
    expect(result).toEqual({
      texto: "uma chave com { ou [ que não deveria quebrar] o parser",
      texto2: 'escapado " [ e } ignorar'
    });
  });

  it('Fixture E (Truncado Aberto): JSON não fechado dispara UnparseableContentError por truncamento', () => {
    const input = `\`\`\`json
    {"user": "ai", "data": [1, 2, 
    `;
    expect(() => extractJsonFromString(input)).toThrowError(UnparseableContentError);
  });

  it('Fixture E (Truncado Balanceado sem Match Real): Dispara UnparseableContentError de sintaxe irrecuperável', () => {
    const input = `Aqui vai: [{ "a": 1 }`; // falta fechar ]
    expect(() => extractJsonFromString(input)).toThrowError(UnparseableContentError);
  });

  it('Fixture Invalid: String sem arrays ou chaves de dicionário', () => {
    const input = `Isto é um texto normal de resposta sem nenhuma intenção estrutural.`;
    expect(() => extractJsonFromString(input)).toThrowError(UnparseableContentError);
  });
});
