/**
 * @module siage-internal.routes
 * Internal endpoints for the SIAGE worker.
 *
 * Auth: X-Worker-Secret header (shared secret), NOT JWT.
 * These endpoints are called by the worker process, not by human users.
 *
 * The tenantId is passed in the request body (the worker knows it from the job).
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { siageService } from './siage.service.js';

// ─── Worker Auth Guard ───────────────────────────────────────────────────────

function workerAuth(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const secret = request.headers['x-worker-secret'];
  if (!secret || secret !== env.SIAGE_WORKER_SECRET) {
    reply.code(401).send({ success: false, message: 'Invalid worker credentials' });
    return;
  }
  done();
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const internalIngestSchema = z.object({
  tenantId: z.string().min(1),
  items: z.array(z.object({
    alunoName: z.string().min(1),
    matriculaSiage: z.string(), // allow empty string
    disciplinaName: z.string().min(1),
    turmaName: z.string().min(1),
    bimester: z.number().int().min(1).max(5),
    value: z.number().min(0).max(10).nullable(),
  })),
});

const internalStatusSchema = z.object({
  tenantId: z.string().min(1),
  status: z.string().min(1),
  errorMessage: z.string().optional(),
});

const runIdParam = z.object({ runId: z.string().min(1) });

// ─── Internal Routes ─────────────────────────────────────────────────────────

export const siageInternalRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  const typed = fastify.withTypeProvider<ZodTypeProvider>();

  // All internal routes use worker secret auth
  typed.addHook('onRequest', workerAuth);

  // ── POST /ingest — Worker pushes extracted items ──
  typed.post(
    '/:runId/ingest',
    { schema: { params: runIdParam, body: internalIngestSchema } },
    async (request, reply) => {
      try {
        const result = await siageService.ingestItems(
          request.params.runId,
          request.body.tenantId,
          request.body.items,
        );
        reply.send({ success: true, data: result });
      } catch (error) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Ingest error',
        });
      }
    },
  );

  // ── POST /status — Worker updates run status ──
  typed.post(
    '/:runId/status',
    { schema: { params: runIdParam, body: internalStatusSchema } },
    async (request, reply) => {
      try {
        const run = await siageService.updateRunStatus(
          request.params.runId,
          request.body.status,
          request.body.errorMessage,
        );
        reply.send({ success: true, data: run });
      } catch (error) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Status update error',
        });
      }
    },
  );

  // ── POST /import — Worker triggers import of matched items ──
  typed.post(
    '/:runId/import',
    { schema: { params: runIdParam, body: z.object({ tenantId: z.string().min(1) }) } },
    async (request, reply) => {
      try {
        const result = await siageService.importMatchedItems(
          request.params.runId,
          request.body.tenantId,
        );
        reply.send({ success: true, data: result });
      } catch (error) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Import error',
        });
      }
    },
  );
};
