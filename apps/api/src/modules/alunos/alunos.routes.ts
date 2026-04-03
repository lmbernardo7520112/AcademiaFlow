import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyInstance } from 'fastify';
import { alunosService } from './alunos.service.js';
import { createAlunoSchema, updateAlunoSchema, alunoStatusUpdateSchema } from '@academiaflow/shared';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

export const alunosRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();
  typedFastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));

  typedFastify.post(
    '/',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { body: createAlunoSchema },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const payload = request.body;
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

  typedFastify.get(
    '/',
    {
      schema: {
        querystring: z.object({
          turmaId: z.string().optional()
        })
      }
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const query = request.query;
        const alunos = await alunosService.list(tenantId, query);
        reply.send({ success: true, data: alunos });
      } catch {
        reply.code(500).send({ success: false, message: 'Erro ao buscar alunos' });
      }
    }
  );

  typedFastify.get('/:id', async (request, reply) => {
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

  typedFastify.put(
    '/:id',
    {
      schema: { body: updateAlunoSchema },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const { id } = request.params as { id: string };
        const payload = request.body;
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

  typedFastify.delete(
    '/:id',
    { preHandler: [fastify.authorize(['admin', 'secretaria'])] },
    async (request, reply) => {
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

  typedFastify.patch(
    '/:id/status',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: { body: alunoStatusUpdateSchema },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const { id } = request.params as { id: string };
        const payload = request.body;
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

