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
  objectIdSchema,
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
        params: z.object({ id: objectIdSchema }),
        body: z.object({ rawText: z.string().min(1) }),
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
      preHandler: [fastify.authorize(['admin', 'secretaria', 'professor'])],
      schema: { params: z.object({ id: objectIdSchema }) },
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
        params: z.object({ id: objectIdSchema }),
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
        reply.code(422).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao atualizar status',
        });
      }
    }
  );

  // ─── #7 PATCH /cases/:id/contacts/:contactId ──────────────────────────

  typedFastify.patch(
    '/cases/:id/contacts/:contactId',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: {
        params: z.object({
          id: objectIdSchema,
          contactId: objectIdSchema,
        }),
        body: correctContactSchema,
      },
    },
    async (request, reply) => {
      try {
        const result = await buscaAtivaService.correctContact(
          request.user.tenantId,
          request.user.id,
          request.params.id,
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
      schema: {
        params: z.object({ id: objectIdSchema }),
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

  // ─── #9 POST /cases/:id/attachments ────────────────────────────────────────
  // Accepts multipart/form-data with one file (max 5MB) and optional description.
  // Validates MIME type, computes SHA-256, persists to disk, appends to case.

  typedFastify.post(
    '/cases/:id/attachments',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { params: z.object({ id: objectIdSchema }) },
    },
    async (request, reply) => {
      try {
        const data = await request.file();
        if (!data) {
          return reply.code(400).send({ success: false, message: 'Nenhum arquivo enviado.' });
        }

        const fileBuffer = await data.toBuffer();
        const description = (data.fields['description'] as { value?: string } | undefined)?.value;

        const result = await buscaAtivaService.uploadAttachment(
          request.user.tenantId,
          request.user.id,
          request.params.id,
          fileBuffer,
          data.filename,
          data.mimetype,
          description,
        );
        reply.code(result.status).send({ success: result.status < 400, ...result.data });
      } catch (error: unknown) {
        fastify.log.error(error, 'Attachment upload error');
        const msg = error instanceof Error ? error.message : 'Erro ao fazer upload do anexo';
        // @fastify/multipart throws a specific error code for size limit
        const code = (error as { code?: string }).code === 'FST_FILES_LIMIT' ||
                     (error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE' ? 413 : 500;
        reply.code(code).send({ success: false, message: msg });
      }
    }
  );

  // ─── #10 GET /cases/:id/attachments/:attachmentId/download ─────────────────
  // Returns raw file buffer with correct Content-Type and Content-Disposition.
  // No @fastify/static needed — reads from disk and sends via reply.send(buffer).

  typedFastify.get(
    '/cases/:id/attachments/:attachmentId/download',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: {
        params: z.object({
          id: objectIdSchema,
          attachmentId: objectIdSchema,
        }),
      },
    },
    async (request, reply) => {
      const result = await buscaAtivaService.downloadAttachment(
        request.user.tenantId,
        request.params.id,
        request.params.attachmentId,
      );
      if (result.status !== 200 || !Buffer.isBuffer(result.data)) {
        return reply.code(result.status).send({ success: false, ...(result.data as object) });
      }
      reply
        .header('Content-Type', result.meta!.mimeType)
        .header('Content-Disposition', `attachment; filename="${result.meta!.originalName}"`)
        .send(result.data);
    }
  );

  // ─── #11 GET /dossie/:alunoId ─────────────────────────────────────────────

  typedFastify.get(
    '/dossie/:alunoId',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria', 'professor'])],
      schema: { params: z.object({ alunoId: objectIdSchema }) },
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
