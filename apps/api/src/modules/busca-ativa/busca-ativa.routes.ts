/**
 * @module busca-ativa.routes
 * Fastify routes for the "Busca Ativa de Alunos Faltosos" feature.
 * 12 endpoints (11 MVP + 1 stretch).
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  importAbsenceListSchema,
  updateCaseStatusSchema,
  correctContactSchema,
  addTimelineEntrySchema,
} from '@academiaflow/shared';
import { buscaAtivaService } from './busca-ativa.service.js';

export const buscaAtivaRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // All routes require authentication
  typedFastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));

  // ─── #1 POST /import ───────────────────────────────────────────────────────

  typedFastify.post(
    '/import',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { body: importAbsenceListSchema },
    },
    async (request, reply) => {
      try {
        const { rawText, previewHash } = request.body;
        const result = await buscaAtivaService.importAbsenceList(
          request.user.tenantId,
          request.user.id,
          rawText,
          previewHash,
        );
        reply.code(result.status).send({ success: result.status < 400, ...result.data });
      } catch (error: unknown) {
        fastify.log.error(error, 'Import error');
        reply.code(500).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao importar listagem',
        });
      }
    }
  );

  // ─── #2 PUT /imports/:id/replace ───────────────────────────────────────────

  typedFastify.put(
    '/imports/:id/replace',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({ rawText: z.string().min(10) }),
      },
    },
    async (request, reply) => {
      try {
        const result = await buscaAtivaService.replaceImport(
          request.user.tenantId,
          request.user.id,
          request.params.id,
          request.body.rawText,
        );
        reply.code(result.status).send({ success: result.status < 400, ...result.data });
      } catch (error: unknown) {
        fastify.log.error(error, 'Replace error');
        reply.code(500).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao substituir importação',
        });
      }
    }
  );

  // ─── #3 GET /imports ───────────────────────────────────────────────────────

  typedFastify.get(
    '/imports',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: {
        querystring: z.object({
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const imports = await buscaAtivaService.listImports(
          request.user.tenantId,
          request.query.dateFrom,
          request.query.dateTo,
        );
        reply.send({ success: true, data: imports });
      } catch {
        reply.code(500).send({ success: false, message: 'Erro ao listar importações' });
      }
    }
  );

  // ─── #4 GET /cases ─────────────────────────────────────────────────────────

  typedFastify.get(
    '/cases',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: {
        querystring: z.object({
          date: z.string().optional(),
          status: z.string().optional(),
          turmaName: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const cases = await buscaAtivaService.listCases(
          request.user.tenantId,
          request.query,
        );
        reply.send({ success: true, data: cases });
      } catch {
        reply.code(500).send({ success: false, message: 'Erro ao listar casos' });
      }
    }
  );

  // ─── #5 GET /cases/:id ─────────────────────────────────────────────────────

  typedFastify.get(
    '/cases/:id',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      try {
        const caso = await buscaAtivaService.getCaseById(
          request.user.tenantId,
          request.params.id,
        );
        if (!caso) {
          reply.code(404).send({ success: false, message: 'Caso não encontrado' });
          return;
        }
        reply.send({ success: true, data: caso });
      } catch {
        reply.code(500).send({ success: false, message: 'Erro ao buscar caso' });
      }
    }
  );

  // ─── #6 PATCH /cases/:id/status ────────────────────────────────────────────

  typedFastify.patch(
    '/cases/:id/status',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: {
        params: z.object({ id: z.string() }),
        body: updateCaseStatusSchema,
      },
    },
    async (request, reply) => {
      try {
        const caso = await buscaAtivaService.updateCaseStatus(
          request.user.tenantId,
          request.user.id,
          request.params.id,
          request.body.status,
        );
        if (!caso) {
          reply.code(404).send({ success: false, message: 'Caso não encontrado' });
          return;
        }
        reply.send({ success: true, data: caso });
      } catch (error: unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao atualizar status',
        });
      }
    }
  );

  // ─── #7 PATCH /cases/:caseId/contacts/:contactId ──────────────────────────

  typedFastify.patch(
    '/cases/:caseId/contacts/:contactId',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: {
        params: z.object({
          caseId: z.string(),
          contactId: z.string(),
        }),
        body: correctContactSchema,
      },
    },
    async (request, reply) => {
      try {
        const result = await buscaAtivaService.correctContact(
          request.user.tenantId,
          request.user.id,
          request.params.caseId,
          request.params.contactId,
          request.body.correctedPhone,
        );
        reply.code(result.status).send({ success: result.status < 400, ...result.data });
      } catch (error: unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao corrigir contato',
        });
      }
    }
  );

  // ─── #8 POST /cases/:id/timeline ───────────────────────────────────────────

  typedFastify.post(
    '/cases/:id/timeline',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: {
        params: z.object({ id: z.string() }),
        body: addTimelineEntrySchema,
      },
    },
    async (request, reply) => {
      try {
        const caso = await buscaAtivaService.addTimelineEntry(
          request.user.tenantId,
          request.user.id,
          request.params.id,
          request.body,
        );
        if (!caso) {
          reply.code(404).send({ success: false, message: 'Caso não encontrado' });
          return;
        }
        reply.code(201).send({ success: true, data: caso });
      } catch (error: unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao adicionar entrada',
        });
      }
    }
  );

  // ─── #9 POST /cases/:id/attachments (stub — needs @fastify/multipart) ─────

  typedFastify.post(
    '/cases/:id/attachments',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (_request, reply) => {
      // Stub: @fastify/multipart integration will be added after spike
      reply.code(501).send({
        success: false,
        message: 'Upload de anexos será implementado após spike de @fastify/multipart.',
      });
    }
  );

  // ─── #10 GET /cases/:caseId/attachments/:attachId/download ─────────────────

  typedFastify.get(
    '/cases/:caseId/attachments/:attachId/download',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: {
        params: z.object({
          caseId: z.string(),
          attachId: z.string(),
        }),
      },
    },
    async (_request, reply) => {
      // Stub: secure download will be implemented with upload
      reply.code(501).send({
        success: false,
        message: 'Download de anexos será implementado após spike de @fastify/multipart.',
      });
    }
  );

  // ─── #11 GET /dossie/:alunoId ─────────────────────────────────────────────

  typedFastify.get(
    '/dossie/:alunoId',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { params: z.object({ alunoId: z.string() }) },
    },
    async (request, reply) => {
      try {
        const cases = await buscaAtivaService.getDossie(
          request.user.tenantId,
          request.params.alunoId,
        );
        reply.send({ success: true, data: cases });
      } catch {
        reply.code(500).send({ success: false, message: 'Erro ao buscar dossiê' });
      }
    }
  );
};
