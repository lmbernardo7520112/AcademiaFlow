import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { turmasService } from './turmas.service.js';
import { createTurmaSchema, updateTurmaSchema } from '@academiaflow/shared';

export const turmasRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  // All routes below require authentication
  fastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));

  fastify.post(
    '/',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { body: createTurmaSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user.tenantId;
        const payload = request.body as import('@academiaflow/shared').CreateTurmaPayload;
        const turma = await turmasService.create(tenantId, payload);
        reply.code(201).send({ success: true, data: turma });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro genérico',
        });
      }
    }
  );

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.user.tenantId;
      const turmas = await turmasService.list(tenantId);
      reply.send({ success: true, data: turmas });
    } catch {
      reply.code(500).send({ success: false, message: 'Erro ao buscar turmas' });
    }
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.user.tenantId;
      const { id } = request.params as { id: string };
      const turma = await turmasService.getById(tenantId, id);
      reply.send({ success: true, data: turma });
    } catch (error: Error | unknown) {
      reply.code(404).send({
        success: false,
        message: error instanceof Error ? error.message : 'Não encontrado',
      });
    }
  });

  fastify.put(
    '/:id',
    {
      schema: { body: updateTurmaSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user.tenantId;
        const { id } = request.params as { id: string };
        const payload = request.body as import('@academiaflow/shared').UpdateTurmaPayload;
        const turma = await turmasService.update(tenantId, id, payload);
        reply.send({ success: true, data: turma });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro de validação',
        });
      }
    }
  );

  fastify.delete(
    '/:id',
    { preHandler: [fastify.authorize(['admin', 'secretaria'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.user.tenantId;
      const { id } = request.params as { id: string };
      const result = await turmasService.softDelete(tenantId, id);
      reply.send(result);
    } catch (error: Error | unknown) {
      reply.code(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Falha ao deletar',
      });
    }
  });
};
