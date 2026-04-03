import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyInstance } from 'fastify';
import { professorService } from './professor.service.js';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

export const professorRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();
  
  typedFastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));
  typedFastify.addHook('onRequest', (request, reply) => fastify.authorize(['professor'])(request, reply));

  typedFastify.get(
    '/disciplinas',
    async (request, reply) => {
      try {
        // [TENANT ISOLATION] Filtrado por tenantId + professorId
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

  typedFastify.get(
    '/turmas',
    async (request, reply) => {
      try {
        // [TENANT ISOLATION] Filtrado por tenantId + professorId
        const tenantId = request.user.tenantId;
        const professorId = request.user.id;
        const result = await professorService.getProfessorTurmas(tenantId, professorId);
        reply.send({ success: true, data: result });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao carregar turmas do professor',
        });
      }
    }
  );
};

