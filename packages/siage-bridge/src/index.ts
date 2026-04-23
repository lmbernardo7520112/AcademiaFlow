/**
 * @module @academiaflow/siage-bridge
 *
 * Anti-corruption layer for SIAGE interoperability.
 * Responsible for:
 * - Playwright page objects (SIAGE login, navigation, extraction) — E2
 * - HTML parsing: raw HTML → siageRawGrade[] — E2
 * - Normalization: siageRawGrade[] → SiageSourceRecord[] — E2
 *
 * This package is intentionally isolated from Fastify, MongoDB, and BullMQ.
 * It communicates exclusively via canonical contracts from @academiaflow/shared.
 */

// Placeholder — real exports arrive in Epic E2
export const BRIDGE_VERSION = '0.1.0' as const;
