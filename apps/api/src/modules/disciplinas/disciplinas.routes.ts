import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { disciplinasService } from './disciplinas.service.js';
import { createDisciplinaSchema, updateDisciplinaSchema } from '@academiaflow/shared';

export const disciplinasRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));

  fastify.post(
    '/',
    {
      schema: { body: createDisciplinaSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = request.body as import('@academiaflow/shared').CreateDisciplinaPayload;
        const result = await disciplinasService.create(payload);
        reply.code(201).send({ success: true, data: result });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao criar disciplina',
        });
      }
    }
  );

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const results = await disciplinasService.list();
      reply.send({ success: true, data: results });
    } catch {
      reply.code(500).send({ success: false, message: 'Erro ao buscar disciplinas' });
    }
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await disciplinasService.getById(id);
      reply.send({ success: true, data: result });
    } catch (error: Error | unknown) {
      reply.code(404).send({
        success: false,
        message: error instanceof Error ? error.message : 'Disciplina não encontrada',
      });
    }
  });

  fastify.put(
    '/:id',
    {
      schema: { body: updateDisciplinaSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const payload = request.body as import('@academiaflow/shared').UpdateDisciplinaPayload;
        const result = await disciplinasService.update(id, payload);
        reply.send({ success: true, data: result });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao atualizar disciplina',
        });
      }
    }
  );

  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await disciplinasService.softDelete(id);
      reply.send(result);
    } catch (error: Error | unknown) {
      reply.code(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao deletar disciplina',
      });
    }
  });
};
