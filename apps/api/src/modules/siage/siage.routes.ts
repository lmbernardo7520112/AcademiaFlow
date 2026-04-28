/**
 * @module siage.routes
 * Fastify routes for SIAGE interoperability.
 *
 * Access control:
 * - All routes: authenticated
 * - Run CRUD + aliases: secretaria/admin only
 * - Internal ingest: secretaria/admin (worker calls through API auth)
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { siageService } from './siage.service.js';
import { enqueueSiageSyncJob } from './siage-queue.js';

// ─── Validation Schemas ──────────────────────────────────────────────────────

const createRunBodySchema = z.object({
  year: z.number().int().min(2020).max(2100),
  bimester: z.number().int().min(1).max(5),
  turmaFilter: z.string().optional(),
  /** SIAGE credentials — encrypted into envelope, never stored */
  credentials: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  /**
   * When true (default), extraction + match only. No writes to Nota.
   * Set to false to enable automatic import after matching.
   */
  dryRun: z.boolean().optional().default(true),
});

const ingestBodySchema = z.object({
  items: z.array(z.object({
    alunoName: z.string().min(1),
    matriculaSiage: z.string().min(1),
    disciplinaName: z.string().min(1),
    turmaName: z.string().min(1),
    bimester: z.number().int().min(1).max(5),
    value: z.number().min(0).max(10).nullable(),
  })),
});

const createAliasBodySchema = z.object({
  siageName: z.string().min(1),
  disciplinaId: z.string().min(1),
});

const resolveItemBodySchema = z.object({
  alunoId: z.string().optional(),
  disciplinaId: z.string().optional(),
});

const runIdParamSchema = z.object({
  runId: z.string().min(1),
});

const itemIdParamSchema = z.object({
  itemId: z.string().min(1),
});

const itemsQuerySchema = z.object({
  matchStatus: z.string().optional(),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

export const siageRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // All SIAGE routes require authentication
  typedFastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));

  // ── POST /runs — Create a new sync run ──
  typedFastify.post(
    '/runs',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { body: createRunBodySchema },
    },
    async (request, reply) => {
      try {
        const run = await siageService.createRun({
          tenantId: request.user.tenantId,
          year: request.body.year,
          bimester: request.body.bimester,
          turmaFilter: request.body.turmaFilter,
          createdBy: request.user.id,
        });

        // Enqueue BullMQ job with encrypted credentials (best-effort)
        const runId = String(run._id);
        try {
          await enqueueSiageSyncJob({
            runId,
            tenantId: request.user.tenantId,
            year: request.body.year,
            bimester: request.body.bimester,
            turmaFilter: request.body.turmaFilter,
            credentials: request.body.credentials,
            dryRun: request.body.dryRun,
          });
        } catch (enqueueErr) {
          // Run was created but queue is unavailable — run stays QUEUED for retry
          request.log.warn({ err: enqueueErr, runId }, 'Failed to enqueue SIAGE job — run stays QUEUED');
        }

        reply.code(201).send({ success: true, data: run });
      } catch (error) {
        reply.code(409).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao criar run',
        });
      }
    },
  );

  // ── GET /runs — List all runs ──
  typedFastify.get(
    '/runs',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
    },
    async (request, reply) => {
      const runs = await siageService.listRuns(request.user.tenantId);
      reply.send({ success: true, data: runs });
    },
  );

  // ── GET /runs/:runId — Get run details ──
  typedFastify.get(
    '/runs/:runId',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { params: runIdParamSchema },
    },
    async (request, reply) => {
      const run = await siageService.getRun(
        request.user.tenantId,
        request.params.runId,
      );
      if (!run) {
        return reply.code(404).send({ success: false, message: 'Run não encontrada' });
      }
      reply.send({ success: true, data: run });
    },
  );

  // ── POST /runs/:runId/cancel — Cancel a run ──
  typedFastify.post(
    '/runs/:runId/cancel',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { params: runIdParamSchema },
    },
    async (request, reply) => {
      try {
        const run = await siageService.cancelRun(
          request.user.tenantId,
          request.params.runId,
        );
        reply.send({ success: true, data: run });
      } catch (error) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao cancelar run',
        });
      }
    },
  );

  // ── GET /runs/:runId/items — List items of a run ──
  typedFastify.get(
    '/runs/:runId/items',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { params: runIdParamSchema, querystring: itemsQuerySchema },
    },
    async (request, reply) => {
      const items = await siageService.listItems(
        request.params.runId,
        request.user.tenantId,
        request.query.matchStatus,
      );
      reply.send({ success: true, data: items });
    },
  );

  // ── POST /runs/:runId/ingest — Internal: worker pushes extracted items ──
  typedFastify.post(
    '/runs/:runId/ingest',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { params: runIdParamSchema, body: ingestBodySchema },
    },
    async (request, reply) => {
      try {
        const result = await siageService.ingestItems(
          request.params.runId,
          request.user.tenantId,
          request.body.items,
        );
        reply.send({ success: true, data: result });
      } catch (error) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro na ingestão',
        });
      }
    },
  );

  // ── POST /runs/:runId/import — Trigger import of matched items ──
  typedFastify.post(
    '/runs/:runId/import',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { params: runIdParamSchema },
    },
    async (request, reply) => {
      try {
        const result = await siageService.importMatchedItems(
          request.params.runId,
          request.user.tenantId,
          request.user.id,
        );
        reply.send({ success: true, data: result });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro no import';
        const code = msg.includes('bloqueada') ? 422 : 400;
        reply.code(code).send({ success: false, message: msg });
      }
    },
  );

  // ── POST /runs/:runId/promote — Explicit promotion (UI-driven, audit trail) ──
  typedFastify.post(
    '/runs/:runId/promote',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { params: runIdParamSchema },
    },
    async (request, reply) => {
      try {
        const result = await siageService.importMatchedItems(
          request.params.runId,
          request.user.tenantId,
          request.user.id,
        );
        reply.send({ success: true, data: result });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro na promoção';
        const code = msg.includes('bloqueada') ? 422 : 400;
        reply.code(code).send({ success: false, message: msg });
      }
    },
  );

  // ── GET /runs/:runId/promote/preview — Preview what promotion would write ──
  typedFastify.get(
    '/runs/:runId/promote/preview',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { params: runIdParamSchema },
    },
    async (request, reply) => {
      try {
        const preview = await siageService.getPromotionPreview(
          request.params.runId,
          request.user.tenantId,
        );
        reply.send({ success: true, data: preview });
      } catch (error) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao gerar preview',
        });
      }
    },
  );

  // ── POST /runs/:runId/items/:itemId/resolve — Manual resolution ──
  typedFastify.post(
    '/runs/:runId/items/:itemId/resolve',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: {
        params: runIdParamSchema.merge(itemIdParamSchema),
        body: resolveItemBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const item = await siageService.resolveItem(
          request.user.tenantId,
          request.params.itemId,
          request.body,
          request.user.id,
        );
        reply.send({ success: true, data: item });
      } catch (error) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro na resolução',
        });
      }
    },
  );

  // ── POST /aliases — Create/update discipline alias ──
  typedFastify.post(
    '/aliases',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { body: createAliasBodySchema },
    },
    async (request, reply) => {
      try {
        const alias = await siageService.createAlias(
          request.user.tenantId,
          request.body.siageName,
          request.body.disciplinaId,
        );
        reply.code(201).send({ success: true, data: alias });
      } catch (error) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao criar alias',
        });
      }
    },
  );

  // ── GET /aliases — List discipline aliases ──
  typedFastify.get(
    '/aliases',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
    },
    async (request, reply) => {
      const aliases = await siageService.listAliases(request.user.tenantId);
      reply.send({ success: true, data: aliases });
    },
  );

  // ── POST /aliases/auto-create — Auto-create aliases by exact name match ──
  typedFastify.post(
    '/aliases/auto-create',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
    },
    async (request, reply) => {
      try {
        const result = await siageService.autoCreateAliases(request.user.tenantId);
        reply.send({ success: true, data: result });
      } catch (error) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao criar aliases automáticos',
        });
      }
    },
  );
};
