import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { notasService } from './notas.service.js';
import { createNotaSchema, createBulkNotasSchema, updateNotaSchema } from '@academiaflow/shared';

// For typing the querystring correctly
import { z } from 'zod';
const notasFilterSchema = z.object({
  alunoId: z.string().optional(),
  disciplinaId: z.string().optional(),
  turmaId: z.string().optional(),
  year: z.coerce.number().optional(),
  bimester: z.coerce.number().optional(),
});

export const notasRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));

  fastify.post(
    '/',
    {
      schema: { body: createNotaSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user.tenantId;
        const payload = request.body as import('@academiaflow/shared').CreateNotaPayload;
        const result = await notasService.create(tenantId, payload);
        reply.code(201).send({ success: true, data: result });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao cadastrar nota',
        });
      }
    }
  );

  fastify.post(
    '/bulk',
    {
      schema: { body: createBulkNotasSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user.tenantId;
        const payload = request.body as import('@academiaflow/shared').CreateBulkNotasPayload;
        const result = await notasService.bulkCreate(tenantId, payload);
        // Returns 201 if fully successful, or 207 Multi-Status if partial
        const statusCode = result.errorCount === 0 ? 201 : 207;
        reply.code(statusCode).send({ success: true, ...result });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro no processamento em lote',
        });
      }
    }
  );

  fastify.get(
    '/',
    {
      schema: { querystring: notasFilterSchema }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.user.tenantId;
      const filters = request.query as z.infer<typeof notasFilterSchema>;
      const results = await notasService.list(tenantId, filters);
      reply.send({ success: true, data: results });
    } catch {
      reply.code(500).send({ success: false, message: 'Erro ao buscar notas' });
    }
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.user.tenantId;
      const { id } = request.params as { id: string };
      const result = await notasService.getById(tenantId, id);
      reply.send({ success: true, data: result });
    } catch (error: Error | unknown) {
      reply.code(404).send({
        success: false,
        message: error instanceof Error ? error.message : 'Nota não encontrada',
      });
    }
  });

  fastify.put(
    '/:id',
    {
      schema: { body: updateNotaSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user.tenantId;
        const { id } = request.params as { id: string };
        const payload = request.body as import('@academiaflow/shared').UpdateNotaPayload;
        const result = await notasService.update(tenantId, id, payload);
        reply.send({ success: true, data: result });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao atualizar nota',
        });
      }
    }
  );

  fastify.delete('/:id', {
    preHandler: [fastify.checkOwnership('nota')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.user.tenantId;
      const { id } = request.params as { id: string };
      const result = await notasService.delete(tenantId, id);
      reply.send(result);
    } catch (error: Error | unknown) {
      reply.code(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao deletar nota',
      });
    }
  });

  fastify.get(
    '/boletim/:turmaId/:disciplinaId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user.tenantId;
        const { turmaId, disciplinaId } = request.params as { turmaId: string, disciplinaId: string };
        const { year } = request.query as { year?: string };
        const currentYear = year ? Number(year) : new Date().getFullYear();
        
        const result = await notasService.getBoletimTurma(tenantId, turmaId, disciplinaId, currentYear);
        reply.send({ success: true, data: result });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao gerar boletim consolidado',
        });
      }
    }
  );
};
