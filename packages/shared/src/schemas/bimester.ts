/**
 * @module bimester
 * Centralized bimester utility for deterministic temporal coherence.
 * Single source of truth for bimester ordering, labeling, and normalization.
 * Phase 2 — Analytics & Deterministic Temporal Coherence.
 */

/** Canonical bimester periods (1-indexed, 4 academic periods) */
export const BIMESTERS = [1, 2, 3, 4] as const;
export type BimesterPeriodo = (typeof BIMESTERS)[number];

/** Full labels for display and axis rendering */
export const BIMESTER_LABELS: Record<BimesterPeriodo, string> = {
  1: '1º Bimestre',
  2: '2º Bimestre',
  3: '3º Bimestre',
  4: '4º Bimestre',
};

/** Short labels for compact UI (charts, headers) */
export const BIMESTER_SHORT_LABELS: Record<BimesterPeriodo, string> = {
  1: '1º Bim',
  2: '2º Bim',
  3: '3º Bim',
  4: '4º Bim',
};

/**
 * Single bimestral slot DTO.
 * - `periodo`: explicit 1-4 identifier (not array index)
 * - `valor`: number | null (null = absence of data, 0 = mathematical zero)
 * - `label`: human-readable label from shared constant
 */
export interface BimestreSlot {
  periodo: BimesterPeriodo;
  valor: number | null;
  label: string;
}

/**
 * Normalizes a sparse map of bimester values into a strict 4-slot array.
 * Guarantees:
 * - Always returns exactly 4 elements, ordered 1→4
 * - Missing periods → valor: null (not 0, not omitted)
 * - Zero (0) is preserved as mathematical zero
 * - Uses canonical labels from shared constants
 */
export function normalizeBimestralSlots(
  values: Partial<Record<BimesterPeriodo, number | null>>
): BimestreSlot[] {
  return BIMESTERS.map((p) => ({
    periodo: p,
    valor: values[p] !== undefined ? values[p]! : null,
    label: BIMESTER_LABELS[p],
  }));
}

/**
 * Type guard: checks if a number is a valid BimesterPeriodo (1-4).
 */
export function isBimesterPeriodo(n: number): n is BimesterPeriodo {
  return BIMESTERS.includes(n as BimesterPeriodo);
}
