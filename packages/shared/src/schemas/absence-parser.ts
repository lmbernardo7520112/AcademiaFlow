/**
 * @module absence-parser
 * Canonical, rule-based parser for daily absence lists.
 * This is a PURE FUNCTION — no I/O, no side-effects, no database.
 *
 * Used by:
 *  - Frontend: client-side preview (read-only)
 *  - Backend: server-authoritative re-parse before persistence
 *
 * Pipeline: 9 sequential stages.
 */
import type { ParseResult, ParsedEntry, ParseWarning, PhoneResult } from './busca-ativa.js';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a raw absence list text into structured entries.
 */
export function parseAbsenceList(rawText: string): ParseResult {
  const warnings: ParseWarning[] = [];

  // [1] Pre-processing
  const cleaned = preprocess(rawText);
  const lines = cleaned.split('\n');

  // [2] Date extraction
  const date = extractDate(lines, warnings);

  // [3-9] Segmentation, detection, extraction
  const entries = parseLines(lines, warnings);

  // Stats
  const stats = {
    totalEntries: entries.length,
    withPhone: entries.filter(e => e.contacts.some(c => c.phones.length > 0)).length,
    withoutPhone: entries.filter(e => e.contacts.every(c => c.phones.length === 0)).length,
    justified: entries.filter(e => e.flags.justified_in_source).length,
    transfers: entries.filter(e => e.flags.possible_transfer).length,
  };

  return { date, entries, warnings, stats };
}

/**
 * Normalize a raw phone string into structured result.
 * NO automatic DDD fill. Missing DDD → warning.
 */
export function normalizePhone(raw: string): PhoneResult {
  const phoneRaw = raw.trim();
  const phoneDigitsOnly = phoneRaw.replace(/\D/g, '');
  const digitCount = phoneDigitsOnly.length;

  // >= 12 digits: might already have country code 55
  if (digitCount >= 12) {
    if (phoneDigitsOnly.startsWith('55')) {
      const remainder = phoneDigitsOnly.slice(2);
      if (remainder.length >= 10 && remainder.length <= 11) {
        return {
          phoneRaw,
          phoneDigitsOnly,
          phoneE164: phoneDigitsOnly,
          phoneIssue: null,
        };
      }
    }
    // 12+ but doesn't start with 55 or invalid structure
    return {
      phoneRaw,
      phoneDigitsOnly,
      phoneE164: null,
      phoneIssue: 'incomplete_phone',
    };
  }

  // 10-11 digits: DDD (2) + number (8-9) → valid, prefix "55"
  if (digitCount >= 10 && digitCount <= 11) {
    return {
      phoneRaw,
      phoneDigitsOnly,
      phoneE164: '55' + phoneDigitsOnly,
      phoneIssue: null,
    };
  }

  // 8-9 digits: valid number but missing DDD
  if (digitCount >= 8 && digitCount <= 9) {
    return {
      phoneRaw,
      phoneDigitsOnly,
      phoneE164: null,
      phoneIssue: 'missing_area_code',
    };
  }

  // < 8 digits: incomplete
  return {
    phoneRaw,
    phoneDigitsOnly,
    phoneE164: null,
    phoneIssue: 'incomplete_phone',
  };
}

/**
 * Extract contacts (responsible adults) from a block of text lines.
 */
export function extractContacts(text: string): Array<{ role: string; name: string; phones: PhoneResult[] }> {
  const contacts: Array<{ role: string; name: string; phones: PhoneResult[] }> = [];

  // Step 1: Split by newlines to handle multi-line blocks
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);

  for (const line of lines) {
    // Step 2: Within each line, split by pipe for "Mãe: X | Pai: Y"
    const pipeSegments = line.split('|').map(s => s.trim()).filter(Boolean);

    let foundInLine = false;
    for (const segment of pipeSegments) {
      const contact = parseContactSegment(segment);
      if (contact) {
        contacts.push(contact);
        foundInLine = true;
      }
    }

    // Step 3: Orphan phone lines (no label) — attach to last contact
    if (!foundInLine && contacts.length > 0) {
      const orphanPhones = extractPhones(line);
      if (orphanPhones.length > 0) {
        const lastContact = contacts[contacts.length - 1]!;
        lastContact.phones.push(...orphanPhones);
      }
    }
  }

  return contacts;
}

/**
 * Normalize a student name for deterministic matching.
 * Lowercase, strip accents, trim.
 */
export function normalizeStudentName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Compute a canonical SHA-256 hash of parsed entries for preview verification.
 * Only entries are included — warnings and stats are excluded.
 *
 * Uses alphabetically sorted keys for deterministic serialization.
 */
export async function computePreviewHash(entries: ParsedEntry[]): Promise<string> {
  const canonical = JSON.stringify(entries, sortedReplacer);

  // Use Web Crypto API (works in both browser and Node 18+)
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * JSON replacer that sorts keys alphabetically at every level.
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

/** [1] Pre-processing: normalize encoding, remove emojis/decorators, trim */
function preprocess(raw: string): string {
  return raw
    // Remove BOM
    .replace(/^\uFEFF/, '')
    // Remove emojis (common ones in the format)
    .replace(/[\u{1F4C5}\u{2705}\u{2611}\u{1F4CB}\u{1F4DD}]/gu, '')
    // Remove decorative separators (━, ─, ═, etc.)
    .replace(/^[━─═▬\-]{3,}$/gm, '')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Trim each line
    .split('\n')
    .map(l => l.trim())
    .join('\n')
    .trim();
}

/** [2] Extract date from the first lines */
function extractDate(lines: string[], warnings: ParseWarning[]): Date | null {
  for (const line of lines.slice(0, 5)) {
    const match = line.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
    if (match && match[1] && match[2] && match[3]) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  warnings.push({
    type: 'missing_date',
    message: 'Data não encontrada no cabeçalho da listagem',
    rawLine: lines[0] || '',
  });
  return null;
}

/** Regex to detect turma headers like "1ª SÉRIE A", "2ª SÉRIE B", "3ª SÉRIE C" */
const TURMA_HEADER_RE = /^(\d+)[ªº]?\s*S[EÉ]RIE\s+([A-Z])/i;

/** Regex to detect "Sem faltosos" blocks */
const SEM_FALTOSOS_RE = /sem\s+faltosos/i;

/** Regex to detect student lines starting with "* " */
const ALUNO_LINE_RE = /^\*\s+(.+)/;

/** [3-9] Parse lines into structured entries */
function parseLines(lines: string[], warnings: ParseWarning[]): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  let currentTurma = '';
  let currentStudentLines: string[] = [];
  let currentStudentName = '';
  let currentRawBlock = '';

  function flushStudent() {
    if (!currentStudentName) return;

    const fullBlock = currentStudentLines.join('\n');
    const entry = buildEntry(currentStudentName, currentTurma, fullBlock, currentRawBlock, warnings);
    entries.push(entry);

    currentStudentName = '';
    currentStudentLines = [];
    currentRawBlock = '';
  }

  for (const line of lines) {
    if (!line) continue;

    // [3] Turma header detection
    const turmaMatch = line.match(TURMA_HEADER_RE);
    if (turmaMatch) {
      flushStudent();
      currentTurma = line;
      continue;
    }

    // [4] "Sem faltosos" detection
    if (SEM_FALTOSOS_RE.test(line)) {
      flushStudent();
      continue;
    }

    // [5] Student line detection
    const alunoMatch = line.match(ALUNO_LINE_RE);
    if (alunoMatch && alunoMatch[1]) {
      flushStudent();
      currentStudentName = alunoMatch[1].trim();
      currentRawBlock = line;
      currentStudentLines = [line];
      continue;
    }

    // [6] Multi-line recomposition — continuation of previous student
    if (currentStudentName) {
      currentStudentLines.push(line);
      currentRawBlock += '\n' + line;
      continue;
    }

    // Unparseable line (not a turma, not a student, not a continuation)
    // Skip known header patterns
    if (line.match(/BUSCA\s+ATIVA/i) || line.match(/ALUNOS\s+FALTOSOS/i)) continue;
    // Skip date-only lines (already extracted)
    if (line.match(/^\d{1,2}[/\-.]?\d{1,2}[/\-.]?\d{2,4}$/)) continue;
    // Skip empty-ish lines
    if (line.length < 3) continue;

    warnings.push({
      type: 'unparseable_line',
      message: `Linha não interpretada: "${line}"`,
      rawLine: line,
    });
  }

  // Flush last student
  flushStudent();

  return entries;
}

/** Build a ParsedEntry from a student name, turma, and concatenated block */
function buildEntry(
  rawStudentName: string,
  turmaName: string,
  fullBlock: string,
  rawBlock: string,
  warnings: ParseWarning[],
): ParsedEntry {
  // [5] Extract observations from the student name line
  const { cleanName, justified, transfer, observations } = extractObservations(rawStudentName);

  // [7] Extract contacts from the full block (excluding student line prefix)
  const contactLines = fullBlock
    .split('\n')
    .map(l => l.replace(/^\*\s+/, '').trim())
    .slice(1) // skip student name line
    .join('\n');

  // Also check if contacts are on the same line as the student name
  const firstLine = fullBlock.split('\n')[0];
  const sameLine = firstLine ? firstLine.replace(/^\*\s+/, '').trim() : '';
  const afterName = sameLine.replace(cleanName, '').trim();
  // Remove observation parentheses from after-name text
  const afterNameCleaned = afterName
    .replace(/\(Justificado\)/gi, '')
    .replace(/\(Poss[ií]vel\s+transfer[eê]ncia\)/gi, '')
    .trim();

  const allContactText = [afterNameCleaned, contactLines].filter(Boolean).join('\n');

  const contacts = extractContacts(allContactText);

  const hasPhones = contacts.some(c => c.phones.length > 0);
  const multipleContacts = contacts.length > 1;
  const multipleNumbers = contacts.some(c => c.phones.length > 1);

  // Generate phone warnings
  for (const contact of contacts) {
    for (const phone of contact.phones) {
      if (phone.phoneIssue === 'missing_area_code') {
        warnings.push({
          type: 'missing_area_code',
          message: `Telefone sem DDD: "${phone.phoneRaw}" para ${cleanName}`,
          rawLine: rawBlock,
        });
      } else if (phone.phoneIssue === 'incomplete_phone') {
        warnings.push({
          type: 'incomplete_phone',
          message: `Telefone incompleto: "${phone.phoneRaw}" para ${cleanName}`,
          rawLine: rawBlock,
        });
      }
    }
  }

  // Flag needs_coordination if justified/transfer but no contacts
  if ((justified || transfer) && !hasPhones) {
    // No warning needed — this is expected
  }

  return {
    rawBlock,
    turmaName,
    turmaId: null,
    alunoName: cleanName,
    alunoId: null,
    contacts,
    flags: {
      justified_in_source: justified,
      possible_transfer: transfer,
      multiple_contacts: multipleContacts,
      multiple_numbers: multipleNumbers,
    },
    observations,
  };
}

/** Extract observations from student name: "(Justificado)", "(Possível transferência)" */
function extractObservations(rawName: string): {
  cleanName: string;
  justified: boolean;
  transfer: boolean;
  observations: string[];
} {
  const observations: string[] = [];
  let justified = false;
  let transfer = false;
  let cleanName = rawName;

  // Check for "(Justificado)"
  if (/\(Justificado\)/i.test(cleanName)) {
    justified = true;
    observations.push('Justificado');
    cleanName = cleanName.replace(/\(Justificado\)/gi, '').trim();
  }

  // Check for "(Possível transferência)"
  if (/\(Poss[ií]vel\s+transfer[eê]ncia\)/i.test(cleanName)) {
    transfer = true;
    observations.push('Possível transferência');
    cleanName = cleanName.replace(/\(Poss[ií]vel\s+transfer[eê]ncia\)/gi, '').trim();
  }

  return { cleanName, justified, transfer, observations };
}

/** Regex to detect contact labels: Mãe, Pai, Resp., Avó, Avô, Avó, Responsável */
const CONTACT_LABEL_RE = /^(M[aã]e|Pai|Resp\.?|Respons[aá]vel|Av[oóô]|Av[oó])\s*:\s*/i;

/** Regex for kinship in parentheses: (Avó), (Tia), (Sogra), etc. */
const KINSHIP_RE = /\((Av[oóô]|Av[oó]|Tia|Tio|Sogra|Madrinha|Padrinho)\)/i;

/** Parse a single contact segment (between pipes or on a line) */
function parseContactSegment(segment: string): { role: string; name: string; phones: PhoneResult[] } | null {
  const labelMatch = segment.match(CONTACT_LABEL_RE);
  if (!labelMatch) {
    // Check if the segment is just phone numbers (orphan continuation line)
    const phones = extractPhones(segment);
    if (phones.length > 0) {
      return null; // phones without label will be handled by recomposition
    }
    return null;
  }

  let role = labelMatch[1] ?? labelMatch[0];
  let remainder = segment.slice(labelMatch[0].length).trim();

  // Check for kinship override in parentheses: "Resp.: Rita (Avó) (9 8616-4092)"
  const kinshipMatch = remainder.match(KINSHIP_RE);
  if (kinshipMatch && kinshipMatch[1]) {
    role = kinshipMatch[1];
    remainder = remainder.replace(KINSHIP_RE, '').trim();
  }

  // Extract name: everything before the first phone parentheses or end
  const nameMatch = remainder.match(/^([^(]+)/);
  const name = nameMatch && nameMatch[1] ? nameMatch[1].trim() : remainder.trim();

  // Extract phones from the remainder
  const phones = extractPhones(remainder);

  if (!name) return null;

  return { role: normalizeRole(role), name, phones };
}

/** Extract phone numbers from a text string */
function extractPhones(text: string): PhoneResult[] {
  const phones: PhoneResult[] = [];

  // Match patterns like: (47 99955-1961), (9 9825-9128), (83 98845-6773), 99634-7857
  // Also handle: (9 9825-9128 / 9 8887-1833) — multiple separated by "/"
  const phonePattern = /\(?\d{0,2}\)?\s*\d?\s*\d{4,5}[-\s]?\d{3,4}/g;

  // First, find all parenthesized groups that might contain phones
  const parenGroups = text.match(/\(([^)]*\d{4,}[^)]*)\)/g) || [];

  for (const group of parenGroups) {
    const inner = group.slice(1, -1); // remove parens
    // Skip kinship-only parens
    if (KINSHIP_RE.test(`(${inner})`)) continue;

    // Split by "/" for multiple numbers
    const parts = inner.split('/').map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
      const digits = part.replace(/\D/g, '');
      if (digits.length >= 5) {
        phones.push(normalizePhone(part));
      }
    }
  }

  // If no phones found in parens, try the whole text
  if (phones.length === 0) {
    const matches = text.match(phonePattern) || [];
    for (const match of matches) {
      const digits = match.replace(/\D/g, '');
      if (digits.length >= 5) {
        phones.push(normalizePhone(match));
      }
    }
  }

  return phones;
}

/** Normalize role labels to canonical form */
function normalizeRole(raw: string): string {
  const lower = raw.toLowerCase().replace(/\.$/, '');
  const map: Record<string, string> = {
    'mãe': 'Mãe',
    'mae': 'Mãe',
    'pai': 'Pai',
    'resp': 'Responsável',
    'responsável': 'Responsável',
    'responsavel': 'Responsável',
    'avó': 'Avó',
    'avo': 'Avó',
    'avô': 'Avô',
    'tia': 'Tia',
    'tio': 'Tio',
    'sogra': 'Sogra',
    'madrinha': 'Madrinha',
    'padrinho': 'Padrinho',
  };
  return map[lower] || raw;
}
