import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { alunosService } from './alunos.service.js';
import { createAlunoSchema, updateAlunoSchema } from '@academiaflow/shared';

export const alunosRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));

  fastify.post(
    '/',
    {
      schema: { body: createAlunoSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = request.body as import('@academiaflow/shared').CreateAlunoPayload;
        const aluno = await alunosService.create(payload);
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
      const query = request.query as { turmaId?: string };
      const alunos = await alunosService.list(query);
      reply.send({ success: true, data: alunos });
    } catch {
      reply.code(500).send({ success: false, message: 'Erro ao buscar alunos' });
    }
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const aluno = await alunosService.getById(id);
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
        const { id } = request.params as { id: string };
        const payload = request.body as import('@academiaflow/shared').UpdateAlunoPayload;
        const aluno = await alunosService.update(id, payload);
        reply.send({ success: true, data: aluno });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao atualizar',
        });
      }
    }
  );

  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await alunosService.softDelete(id);
      reply.send(result);
    } catch (error: Error | unknown) {
      reply.code(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao deletar aluno',
      });
    }
  });
};
