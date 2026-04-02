import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { reportsService } from './reports.service.js';

export const reportsRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));

  fastify.get(
    '/dashboard',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user.tenantId;
        const metrics = await reportsService.getDashboardMetrics(tenantId);
        reply.send({ success: true, data: metrics });
      } catch (error: Error | unknown) {
        reply.code(500).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao buscar relatórios',
        });
      }
    }
  );
};
