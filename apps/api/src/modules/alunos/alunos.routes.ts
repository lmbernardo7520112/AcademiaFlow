import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { alunosService } from './alunos.service.js';
import { createAlunoSchema, updateAlunoSchema, alunoStatusUpdateSchema } from '@academiaflow/shared';

export const alunosRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));

  fastify.post(
    '/',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { body: createAlunoSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user.tenantId;
        const payload = request.body as import('@academiaflow/shared').CreateAlunoPayload;
        const aluno = await alunosService.create(tenantId, payload);
        reply.code(201).send({ success: true, data: aluno });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao criar aluno',
        });
      }
    }
  );

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.user.tenantId;
      const query = request.query as { turmaId?: string };
      const alunos = await alunosService.list(tenantId, query);
      reply.send({ success: true, data: alunos });
    } catch {
      reply.code(500).send({ success: false, message: 'Erro ao buscar alunos' });
    }
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = request.user.tenantId;
      const { id } = request.params as { id: string };
      const aluno = await alunosService.getById(tenantId, id);
      reply.send({ success: true, data: aluno });
    } catch (error: Error | unknown) {
      reply.code(404).send({
        success: false,
        message: error instanceof Error ? error.message : 'Aluno não encontrado',
      });
    }
  });

  fastify.put(
    '/:id',
    {
      schema: { body: updateAlunoSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user.tenantId;
        const { id } = request.params as { id: string };
        const payload = request.body as import('@academiaflow/shared').UpdateAlunoPayload;
        const aluno = await alunosService.update(tenantId, id, payload);
        reply.send({ success: true, data: aluno });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao atualizar',
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
      const result = await alunosService.softDelete(tenantId, id);
      reply.send(result);
    } catch (error: Error | unknown) {
      reply.code(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao deletar aluno',
      });
    }
  });

  fastify.patch(
    '/:id/status',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { body: alunoStatusUpdateSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user.tenantId;
        const { id } = request.params as { id: string };
        const payload = request.body as import('@academiaflow/shared').AlunoStatusUpdatePayload;
        const aluno = await alunosService.updateStatus(tenantId, id, payload);
        reply.send({ success: true, data: aluno });
      } catch (error: Error | unknown) {
        // Normalização: 422 para erros de regra de negócio (exclusividade) ou validação
        const message = error instanceof Error ? error.message : 'Erro ao atualizar status';
        const code = message.includes('encontrado') ? 404 : 422;
        reply.code(code).send({
          success: false,
          message,
        });
      }
    }
  );
};

