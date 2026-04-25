import { describe, it, expect } from 'vitest';
import { encryptCredentials, decryptCredentials, type SiageCredentials } from './secret-envelope.js';

const MASTER_KEY = 'test-master-key-at-least-16-chars';
const RUN_ID = '507f1f77bcf86cd799439011';

describe('Secret Envelope', () => {
  const credentials: SiageCredentials = {
    username: 'professor@example.com',
    password: 'FAKE_ENVELOPE_TEST_VALUE',
  };

  it('encrypts and decrypts credentials correctly', () => {
    const envelope = encryptCredentials(credentials, RUN_ID, MASTER_KEY);
    const decrypted = decryptCredentials(envelope, RUN_ID, MASTER_KEY);
    expect(decrypted.username).toBe(credentials.username);
    expect(decrypted.password).toBe(credentials.password);
  });

  it('produces different ciphertexts for different runIds', () => {
    const env1 = encryptCredentials(credentials, 'run-aaa', MASTER_KEY);
    const env2 = encryptCredentials(credentials, 'run-bbb', MASTER_KEY);
    expect(env1.encrypted).not.toBe(env2.encrypted);
  });

  it('fails to decrypt with wrong master key', () => {
    const envelope = encryptCredentials(credentials, RUN_ID, MASTER_KEY);
    expect(() => decryptCredentials(envelope, RUN_ID, 'wrong-key-that-is-long-enough')).toThrow();
  });

  it('fails to decrypt with wrong runId (salt mismatch)', () => {
    const envelope = encryptCredentials(credentials, RUN_ID, MASTER_KEY);
    expect(() => decryptCredentials(envelope, 'different-run-id', MASTER_KEY)).toThrow();
  });

  it('fails to decrypt tampered ciphertext', () => {
    const envelope = encryptCredentials(credentials, RUN_ID, MASTER_KEY);
    const tampered = { ...envelope, encrypted: envelope.encrypted.replace(/^.{4}/, 'dead') };
    expect(() => decryptCredentials(tampered, RUN_ID, MASTER_KEY)).toThrow();
  });

  it('rejects master key shorter than 16 chars', () => {
    expect(() => encryptCredentials(credentials, RUN_ID, 'short')).toThrow('at least 16');
    expect(() => decryptCredentials({ encrypted: '', iv: '', tag: '' }, RUN_ID, 'short')).toThrow('at least 16');
  });

  it('never exposes credentials in envelope fields', () => {
    const envelope = encryptCredentials(credentials, RUN_ID, MASTER_KEY);
    const envelopeStr = JSON.stringify(envelope);
    expect(envelopeStr).not.toContain(credentials.username);
    expect(envelopeStr).not.toContain(credentials.password);
  });
});
