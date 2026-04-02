import { z } from 'zod';
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

  fastify.get(
    '/turmas/taxas',
    {
      schema: {
        querystring: z.object({
          year: z.coerce.number().int().default(() => new Date().getFullYear()),
        }),
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const { year } = request.query as { year: number };
        const metrics = await reportsService.getTaxasAprovacaoPorTurma(tenantId, year);
        reply.send({ success: true, data: metrics });
      } catch (error: Error | unknown) {
        reply.code(500).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao buscar taxas de aprovação',
        });
      }
    }
  );

  fastify.get(
    '/turmas/:turmaId/dashboard',
    {
      schema: {
        params: z.object({
          turmaId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const { turmaId } = request.params as { turmaId: string };
        const metrics = await reportsService.getDashboardTurma(tenantId, turmaId);
        reply.send({ success: true, data: metrics });
      } catch (error: Error | unknown) {
        reply.code(500).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao buscar dashboard da turma',
        });
      }
    }
  );

  fastify.get(
    '/turmas/:turmaId/boletins/export',
    {
      schema: {
        params: z.object({ turmaId: z.string() }),
        querystring: z.object({
          year: z.coerce.number().int().default(() => new Date().getFullYear()),
        }),
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const { turmaId } = request.params as { turmaId: string };
        const { year } = request.query as { year: number };
        
        const { buffer, filename } = await reportsService.exportBoletinsTurmaToExcel(tenantId, turmaId, year);
        
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
        reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        reply.send(buffer);
      } catch (error: Error | unknown) {
        reply.code(500).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao exportar boletins',
        });
      }
    }
  );
};
