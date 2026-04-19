import { describe, it, expect } from 'vitest';
import {
  parseAbsenceList,
  normalizePhone,
  extractContacts,
  normalizeStudentName,
  computePreviewHash,
} from './absence-parser.js';

// ─── Real School Listing Fixture ─────────────────────────────────────────────

const REAL_LISTING = `BUSCA ATIVA – ALUNOS FALTOSOS
📅 17/04/2026

━━━━━━━━━━━━━━━
1ª SÉRIE A
* Kalebe de Souza Gomes
Mãe: Magda (47 99955-1961) | Pai: Ronildo (47 99609-3204)

* Lavínia Guedes da Costa
Pai: Antônio (83 98845-6773)

━━━━━━━━━━━━━━━
1ª SÉRIE B
* Lucas Gabriel Macedo de Souza
Mãe: Ana Cláudia (83 98816-8206)

* Elis Elailly Cândido da Silva
Responsável: Ericla (83 99198-1501)

━━━━━━━━━━━━━━━
1ª SÉRIE C
* Beatriz da Cruz Souza
Mãe: Patrícia (65 98104-3230)

* Davi Silva de Araújo
Mãe: Maria Elieny (83 98917-4147)

* Layanny Vitória Ferreira da Silva
Pai: Fábio (83 99696-4054) | Mãe: Lucilene (99634-7857)

* Raul Vinícius P. M. Lima
Pai: Anderson (83 98713) | Mãe: Larissa (98223-6792)

* Samuel Euzébio Farias
Mãe: Maria José (83 98891-1169)

* Thaynná Evellen S. de Brito
Mãe: Cássia (83 98627-9604)

* Pedro Cauã Morais Araújo
Mãe: Carla (83 99602-0343)

━━━━━━━━━━━━━━━
2ª SÉRIE A
* Ana Beatriz C. Bandeira
Resp.: Bruna (9 9825-9128 / 9 8887-1833)

* Carlos Eduardo F. Silvino
Resp.: Elisabeth (9 8777-0179)

* Evelyn Silvino de Lima
Resp.: Rita (Avó) (9 8616-4092)

* Marielly G. de O. Freire
Resp.: Mariângela (9 8704-7464 / 9 8730-6447)

* Pérolla Vittória O. Lima
Resp.: Fabiana (9 8757-2350 / 9 8880-5332)

* Thiago Gabriel L. Freire
Resp.: Ruth (9 8719-1991 / 9 8670-1598)

* Yasmim Lohane M. Coelho
Resp.: Erika (9 9295-6990 / 9 8122-5808)

━━━━━━━━━━━━━━━
2ª SÉRIE B
* Arthur Kauã F. Barbosa
Resp.: Daniela (9 9644-0645 / 9 9844-0926)

* Gabryelle Nayara P. Sousa
Resp.: Edilma (9 9117-1820 / 9 9658-8771)

* Jonathan Caio G. Lima
Resp.: Janaína (9 8636-4295 / 9 8740-7841)

* Roberto Pê
Resp.: Rômulo (9 9895-3747 / 9 8670-2525 / 9 8630-5077)

* Welena Maria F. Silva
Resp.: Maria das Neves (Sogra)
(9 9947-1011 / 9 8809-2319)

━━━━━━━━━━━━━━━
2ª SÉRIE C
* Ágatha Fernanda Leite Alves
Resp.: Ana Flávia (9 9354-7908)

* Kalyel Artur S. Martins
Resp.: Maria Aparecida (9 9855-4418)

* Kevin Lucas Leite de Sousa (Justificado)

* Leandro Júnior L. Costa
Resp.: Simone (9 8784-8691)

* Lendryus Lima da Costa
Resp.: Simone (9 8784-8691)

* Leonardo Aprígio M. Santos (Possível transferência)

* Maria Clara L. Almeida
Resp.: Marcos (9 9622-4553 / 9 9959-2854)

* Nayara Kely S. Santos
Resp.: Josileide (9 9809-7486)

* Tayná Rodrigues Alves
Resp.: Rejane (9 8770-4271 / 9 8662-0680)

* Yasmin da Silva Ferreira
Resp.: Ana Cláudia (Tia)
(9 9837-3085 / 9 9307-6238)

━━━━━━━━━━━━━━━
3ª SÉRIE A
* Jakson Lopes de Azevedo
Mãe: Edileuza (83 99943-6979)
Pai: Jader (83 99889-6487)

* Katllyn Vitória F. Santos
Avó: Gracietes (83 99927-2961)

* Roanderson A. P. Ribeiro
Resp.: Vanessa (83 99948-1917)

━━━━━━━━━━━━━━━
3ª SÉRIE B
✅ Sem faltosos`;

// ─── normalizePhone ──────────────────────────────────────────────────────────

describe('normalizePhone', () => {
  it('P-05: normalizes phone with explicit DDD', () => {
    const result = normalizePhone('47 99955-1961');
    expect(result.phoneDigitsOnly).toBe('47999551961');
    expect(result.phoneE164).toBe('5547999551961');
    expect(result.phoneIssue).toBeNull();
  });

  it('normalizes phone with DDD in parens', () => {
    const result = normalizePhone('(83) 98845-6773');
    expect(result.phoneDigitsOnly).toBe('83988456773');
    expect(result.phoneE164).toBe('5583988456773');
    expect(result.phoneIssue).toBeNull();
  });

  it('P-06: marks phone without DDD as missing_area_code', () => {
    const result = normalizePhone('9 9825-9128');
    expect(result.phoneDigitsOnly).toBe('998259128');
    expect(result.phoneE164).toBeNull();
    expect(result.phoneIssue).toBe('missing_area_code');
  });

  it('P-09: marks 9-digit number without DDD as missing_area_code', () => {
    const result = normalizePhone('99634-7857');
    expect(result.phoneDigitsOnly).toBe('996347857');
    expect(result.phoneE164).toBeNull();
    expect(result.phoneIssue).toBe('missing_area_code');
  });

  it('P-08: marks truncated number as incomplete', () => {
    const result = normalizePhone('98713');
    expect(result.phoneDigitsOnly).toBe('98713');
    expect(result.phoneE164).toBeNull();
    expect(result.phoneIssue).toBe('incomplete_phone');
  });

  it('marks DDD + truncated number as incomplete', () => {
    const result = normalizePhone('83 98713');
    expect(result.phoneDigitsOnly).toBe('8398713');
    expect(result.phoneE164).toBeNull();
    expect(result.phoneIssue).toBe('incomplete_phone');
  });

  it('normalizes 11-digit DDD + number', () => {
    const result = normalizePhone('83 99943-6979');
    expect(result.phoneE164).toBe('5583999436979');
    expect(result.phoneIssue).toBeNull();
  });

  it('normalizes 10-digit DDD + number (landline)', () => {
    const result = normalizePhone('83 3232-1234');
    expect(result.phoneE164).toBe('558332321234');
    expect(result.phoneIssue).toBeNull();
  });

  it('preserves raw phone text', () => {
    const result = normalizePhone('   47 99955-1961  ');
    expect(result.phoneRaw).toBe('47 99955-1961');
  });
});

// ─── extractContacts ─────────────────────────────────────────────────────────

describe('extractContacts', () => {
  it('extracts Mãe with phone', () => {
    const contacts = extractContacts('Mãe: Magda (47 99955-1961)');
    expect(contacts).toHaveLength(1);
    expect(contacts[0].role).toBe('Mãe');
    expect(contacts[0].name).toBe('Magda');
    expect(contacts[0].phones).toHaveLength(1);
    expect(contacts[0].phones[0].phoneE164).toBe('5547999551961');
  });

  it('P-05: extracts Mãe + Pai with pipe separator', () => {
    const contacts = extractContacts(
      'Mãe: Magda (47 99955-1961) | Pai: Ronildo (47 99609-3204)'
    );
    expect(contacts).toHaveLength(2);
    expect(contacts[0].role).toBe('Mãe');
    expect(contacts[1].role).toBe('Pai');
  });

  it('extracts Responsável', () => {
    const contacts = extractContacts('Responsável: Ericla (83 99198-1501)');
    expect(contacts).toHaveLength(1);
    expect(contacts[0].role).toBe('Responsável');
  });

  it('extracts Resp. abbreviated', () => {
    const contacts = extractContacts('Resp.: Bruna (9 9825-9128 / 9 8887-1833)');
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe('Bruna');
    expect(contacts[0].phones).toHaveLength(2);
  });

  it('P-07: extracts kinship override (Avó) from parentheses', () => {
    const contacts = extractContacts('Resp.: Rita (Avó) (9 8616-4092)');
    expect(contacts).toHaveLength(1);
    expect(contacts[0].role).toBe('Avó');
    expect(contacts[0].name).toBe('Rita');
  });

  it('extracts Avó as direct label', () => {
    const contacts = extractContacts('Avó: Gracietes (83 99927-2961)');
    expect(contacts).toHaveLength(1);
    expect(contacts[0].role).toBe('Avó');
  });

  it('extracts Tia kinship override', () => {
    const contacts = extractContacts('Resp.: Ana Cláudia (Tia)\n(9 9837-3085 / 9 9307-6238)');
    expect(contacts).toHaveLength(1);
    expect(contacts[0].role).toBe('Tia');
  });

  it('extracts Sogra kinship override', () => {
    const contacts = extractContacts('Resp.: Maria das Neves (Sogra)\n(9 9947-1011 / 9 8809-2319)');
    expect(contacts).toHaveLength(1);
    expect(contacts[0].role).toBe('Sogra');
  });

  it('P-13: extracts 3 phones from single contact', () => {
    const contacts = extractContacts('Resp.: Rômulo (9 9895-3747 / 9 8670-2525 / 9 8630-5077)');
    expect(contacts).toHaveLength(1);
    expect(contacts[0].phones).toHaveLength(3);
  });

  it('extracts multi-line Mãe + Pai', () => {
    const contacts = extractContacts(
      'Mãe: Edileuza (83 99943-6979)\nPai: Jader (83 99889-6487)'
    );
    expect(contacts).toHaveLength(2);
    expect(contacts[0].role).toBe('Mãe');
    expect(contacts[1].role).toBe('Pai');
  });

  it('returns empty array for empty text', () => {
    expect(extractContacts('')).toHaveLength(0);
  });
});

// ─── normalizeStudentName ────────────────────────────────────────────────────

describe('normalizeStudentName', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeStudentName('Ágatha Fernanda Leite Alves')).toBe('agatha fernanda leite alves');
  });

  it('trims whitespace', () => {
    expect(normalizeStudentName('  João   Pedro  ')).toBe('joao pedro');
  });

  it('handles tilde/cedilla', () => {
    expect(normalizeStudentName('Thaynná Evellen S. de Brito')).toBe('thaynna evellen s. de brito');
  });

  it('handles name with special characters', () => {
    expect(normalizeStudentName('Pérolla Vittória O. Lima')).toBe('perolla vittoria o. lima');
  });
});

// ─── parseAbsenceList — Full Integration ─────────────────────────────────────

describe('parseAbsenceList', () => {
  it('P-01: extracts date from header with emoji', () => {
    const result = parseAbsenceList(REAL_LISTING);
    expect(result.date).not.toBeNull();
    expect(result.date!.getDate()).toBe(17);
    expect(result.date!.getMonth()).toBe(3); // April = 3
    expect(result.date!.getFullYear()).toBe(2026);
  });

  it('P-02: identifies turma blocks', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const turmas = [...new Set(result.entries.map(e => e.turmaName))];
    expect(turmas).toContain('1ª SÉRIE A');
    expect(turmas).toContain('2ª SÉRIE C');
    expect(turmas).toContain('3ª SÉRIE A');
  });

  it('P-03: skips "Sem faltosos" block (3ª SÉRIE B)', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const serie3b = result.entries.filter(e => e.turmaName.includes('3ª SÉRIE B'));
    expect(serie3b).toHaveLength(0);
  });

  it('P-04: extracts student names correctly', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const names = result.entries.map(e => e.alunoName);
    expect(names).toContain('Kalebe de Souza Gomes');
    expect(names).toContain('Lavínia Guedes da Costa');
    expect(names).toContain('Pedro Cauã Morais Araújo');
  });

  it('P-10: detects justified student', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const kevin = result.entries.find(e => e.alunoName.includes('Kevin'));
    expect(kevin).toBeDefined();
    expect(kevin!.flags.justified_in_source).toBe(true);
    expect(kevin!.observations).toContain('Justificado');
  });

  it('P-11: detects possible transfer', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const leonardo = result.entries.find(e => e.alunoName.includes('Leonardo'));
    expect(leonardo).toBeDefined();
    expect(leonardo!.flags.possible_transfer).toBe(true);
  });

  it('P-12: multiline Sogra recomposition', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const welena = result.entries.find(e => e.alunoName.includes('Welena'));
    expect(welena).toBeDefined();
    expect(welena!.contacts).toHaveLength(1);
    expect(welena!.contacts[0].role).toBe('Sogra');
    expect(welena!.contacts[0].phones.length).toBeGreaterThanOrEqual(1);
  });

  it('P-14: multiline Mãe+Pai (Jakson)', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const jakson = result.entries.find(e => e.alunoName.includes('Jakson'));
    expect(jakson).toBeDefined();
    expect(jakson!.contacts).toHaveLength(2);
    const roles = jakson!.contacts.map(c => c.role);
    expect(roles).toContain('Mãe');
    expect(roles).toContain('Pai');
  });

  it('P-16: parses full real listing with 30+ entries', () => {
    const result = parseAbsenceList(REAL_LISTING);
    expect(result.entries.length).toBeGreaterThanOrEqual(30);
    expect(result.stats.totalEntries).toBe(result.entries.length);
  });

  it('generates warnings for phones without DDD', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const missingDDD = result.warnings.filter(w => w.type === 'missing_area_code');
    expect(missingDDD.length).toBeGreaterThan(0);
  });

  it('generates warnings for incomplete phones', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const incomplete = result.warnings.filter(w => w.type === 'incomplete_phone');
    expect(incomplete.length).toBeGreaterThanOrEqual(1); // "83 98713" and "98223-6792" situation
  });

  it('counts justified students in stats', () => {
    const result = parseAbsenceList(REAL_LISTING);
    expect(result.stats.justified).toBeGreaterThanOrEqual(1);
  });

  it('counts transfers in stats', () => {
    const result = parseAbsenceList(REAL_LISTING);
    expect(result.stats.transfers).toBeGreaterThanOrEqual(1);
  });

  it('identifies 3 telefone Roberto Pê', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const roberto = result.entries.find(e => e.alunoName.includes('Roberto'));
    expect(roberto).toBeDefined();
    expect(roberto!.contacts[0].phones).toHaveLength(3);
  });

  it('identifies Mãe+Pai with pipe (Kalebe)', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const kalebe = result.entries.find(e => e.alunoName.includes('Kalebe'));
    expect(kalebe).toBeDefined();
    expect(kalebe!.contacts).toHaveLength(2);
    expect(kalebe!.flags.multiple_contacts).toBe(true);
  });

  it('P-15: handles empty listing', () => {
    const result = parseAbsenceList('   ');
    expect(result.entries).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThanOrEqual(0);
  });

  it('identifies Avó label directly', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const katllyn = result.entries.find(e => e.alunoName.includes('Katllyn'));
    expect(katllyn).toBeDefined();
    expect(katllyn!.contacts).toHaveLength(1);
    expect(katllyn!.contacts[0].role).toBe('Avó');
  });

  it('handles mixed DDD presence (Layanny)', () => {
    const result = parseAbsenceList(REAL_LISTING);
    const layanny = result.entries.find(e => e.alunoName.includes('Layanny'));
    expect(layanny).toBeDefined();
    // Pai has DDD 83, Mãe has no DDD
    expect(layanny!.contacts).toHaveLength(2);
    const pai = layanny!.contacts.find(c => c.role === 'Pai');
    const mae = layanny!.contacts.find(c => c.role === 'Mãe');
    expect(pai).toBeDefined();
    expect(mae).toBeDefined();
    // Pai: (83 99696-4054) → valid
    expect(pai!.phones[0].phoneE164).not.toBeNull();
    // Mãe: (99634-7857) → missing_area_code
    expect(mae!.phones[0].phoneIssue).toBe('missing_area_code');
  });
});

// ─── computePreviewHash ──────────────────────────────────────────────────────

describe('computePreviewHash', () => {
  it('produces consistent hash for same input', async () => {
    const result = parseAbsenceList(REAL_LISTING);
    const hash1 = await computePreviewHash(result.entries);
    const hash2 = await computePreviewHash(result.entries);
    expect(hash1).toBe(hash2);
  });

  it('produces different hash for different input', async () => {
    const result1 = parseAbsenceList(REAL_LISTING);
    const result2 = parseAbsenceList('17/04/2026\n1ª SÉRIE A\n* João Silva\nMãe: Ana (83 99999-0000)');
    const hash1 = await computePreviewHash(result1.entries);
    const hash2 = await computePreviewHash(result2.entries);
    expect(hash1).not.toBe(hash2);
  });

  it('produces hex string of 64 chars (SHA-256)', async () => {
    const result = parseAbsenceList(REAL_LISTING);
    const hash = await computePreviewHash(result.entries);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles empty entries array', async () => {
    const hash = await computePreviewHash([]);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
