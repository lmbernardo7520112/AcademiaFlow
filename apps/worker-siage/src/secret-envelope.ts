/**
 * @module secret-envelope
 * Encrypt/decrypt SIAGE credentials for ephemeral job transport.
 *
 * Design:
 * - Uses AES-256-GCM with a per-run IV (derived from runId + master key)
 * - Credentials exist only in memory during job execution
 * - No credentials are ever stored in MongoDB or logs
 * - Master key comes from SIAGE_ENVELOPE_KEY env var
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm' as const;
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export interface SiageCredentials {
  username: string;
  password: string;
}

export interface SecretEnvelope {
  encrypted: string; // hex-encoded ciphertext
  iv: string;        // hex-encoded IV
  tag: string;       // hex-encoded auth tag
}

function deriveKey(masterKey: string, salt: string): Buffer {
  return scryptSync(masterKey, salt, KEY_LENGTH);
}

/**
 * Encrypt SIAGE credentials into an ephemeral envelope.
 * The envelope is tied to the runId (used as salt for key derivation).
 */
export function encryptCredentials(
  credentials: SiageCredentials,
  runId: string,
  masterKey: string,
): SecretEnvelope {
  if (!masterKey || masterKey.length < 16) {
    throw new Error('SIAGE_ENVELOPE_KEY must be at least 16 characters');
  }

  const key = deriveKey(masterKey, runId);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt SIAGE credentials from an ephemeral envelope.
 * Throws on tampered data or wrong key.
 */
export function decryptCredentials(
  envelope: SecretEnvelope,
  runId: string,
  masterKey: string,
): SiageCredentials {
  if (!masterKey || masterKey.length < 16) {
    throw new Error('SIAGE_ENVELOPE_KEY must be at least 16 characters');
  }

  const key = deriveKey(masterKey, runId);
  const iv = Buffer.from(envelope.iv, 'hex');
  const tag = Buffer.from(envelope.tag, 'hex');
  const encrypted = Buffer.from(envelope.encrypted, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as SiageCredentials;
}
