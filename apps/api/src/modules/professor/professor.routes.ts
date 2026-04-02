import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { professorService } from './professor.service.js';

export const professorRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));
  fastify.addHook('onRequest', (request, reply) => fastify.authorize(['professor'])(request, reply));

  fastify.get(
    '/disciplinas',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user.tenantId;
        const professorId = request.user.id;
        const result = await professorService.getDisciplinesByProfessor(tenantId, professorId);
        reply.send({ success: true, data: result });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao carregar disciplinas do professor',
        });
      }
    }
  );
};
