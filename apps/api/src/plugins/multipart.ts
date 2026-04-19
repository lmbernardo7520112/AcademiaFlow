/**
 * @module plugins/multipart
 * Registers @fastify/multipart with safe limits for atestado uploads.
 *
 * Limits:
 *   - fileSize: 5MB  — adequate for PDFs and compressed images
 *   - files: 1       — one attachment per request (keeps atomic timeline entry)
 *   - fieldSize: 1KB — for the optional `description` field
 *
 * These limits are enforced at the transport layer before route handlers run.
 */
import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';

export const MB = 1024 * 1024;

export default fp(async function multipartPlugin(app: FastifyInstance) {
  await app.register(multipart, {
    limits: {
      fileSize: 5 * MB,    // 5 MB hard cap
      files: 1,             // single file per upload request
      fieldSize: 1024,      // 1 KB for description text field
    },
  });
});
