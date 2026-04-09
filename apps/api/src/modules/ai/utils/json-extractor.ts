import { UnparseableContentError } from '../errors.js';

export function extractJsonFromString(input: string): unknown {
  if (!input || typeof input !== 'string') {
    throw new UnparseableContentError('String vazia ou inválida recebida do provider.');
  }

  const trimmed = input.trim();

  // 1. Tentar localizar blocos de markdown tradicionais
  const regexFence = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = trimmed.match(regexFence);

  let candidateStr = trimmed;
  if (match && match[1]) {
    candidateStr = match[1].trim();
  }

  // 2. Tentar o parse direto (se veio limpo)
  try {
    return JSON.parse(candidateStr);
  } catch {
    // Ignorar a primeira falha, vamos para a varredura
  }

  // 3. Fallback Sintático: Balanceamento do escopo `{} ` ou `[]` ignorando texto introdutório da IA
  const firstBracket = candidateStr.indexOf('{');
  const firstSquare = candidateStr.indexOf('[');
  
  if (firstBracket === -1 && firstSquare === -1) {
    throw new UnparseableContentError('O motor de IA retornou uma interface não compatível com análise de dados');
  }

  let startIndex = -1;
  let isArray = false;

  if (firstBracket !== -1 && firstSquare !== -1) {
    if (firstBracket < firstSquare) {
      startIndex = firstBracket;
    } else {
      startIndex = firstSquare;
      isArray = true;
    }
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  } else {
    startIndex = firstSquare;
    isArray = true;
  }

  let stack = 0;
  let inString = false;
  let escapeNext = false;
  let endIndex = -1;

  for (let i = startIndex; i < candidateStr.length; i++) {
    const char = candidateStr[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (isArray) {
        if (char === '[') stack++;
        else if (char === ']') stack--;
      } else {
        if (char === '{') stack++;
        else if (char === '}') stack--;
      }

      if (stack === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex === -1 || stack !== 0) {
    throw new UnparseableContentError('O motor de IA retornou uma interface não compatível com análise de dados (Estrutura truncada)');
  }

  const extracted = candidateStr.substring(startIndex, endIndex + 1);

  try {
    return JSON.parse(extracted);
  } catch {
    throw new UnparseableContentError('O motor de IA retornou uma interface não compatível com análise de dados (Sintaxe irrecuperável)');
  }
}
