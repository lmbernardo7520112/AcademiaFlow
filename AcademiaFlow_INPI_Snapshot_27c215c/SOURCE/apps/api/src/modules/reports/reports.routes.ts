import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { reportsService } from './reports.service.js';
import { 
  turmasTaxasResponseSchema, 
  turmaDashboardSchema, 
  professorAnalyticsSchema,
  boletimIndividualSchema 
} from '@academiaflow/shared';
import { DisciplinaModel } from '../../models/Disciplina.js';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

export const reportsRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();
  typedFastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));

  typedFastify.get(
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

  typedFastify.get(
    '/turmas/taxas',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
      schema: {
        querystring: z.object({
          year: z.coerce.number().int().default(() => new Date().getFullYear()),
        }),
        response: {
          200: z.object({ success: z.literal(true), data: turmasTaxasResponseSchema }),
          '4xx': z.object({ success: z.literal(false), message: z.string() }),
          '5xx': z.object({ success: z.literal(false), message: z.string() })
        }
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const { year } = request.query;
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

  typedFastify.get(
    '/turmas/:turmaId/dashboard',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria', 'professor'])],
      schema: {
        params: z.object({
          turmaId: z.string(),
        }),
        response: {
          200: z.object({ success: z.literal(true), data: turmaDashboardSchema }),
          '4xx': z.object({ success: z.literal(false), message: z.string() }),
          '5xx': z.object({ success: z.literal(false), message: z.string() })
        }
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const { turmaId } = request.params;

        // RBAC Check for Professor (Owner Scope)
        if (request.user.role === 'professor') {
          const isOwner = await DisciplinaModel.exists({ 
            tenantId, 
            turmaIds: { $in: [turmaId] }, 
            professorId: request.user.id,
            isActive: true 
          });
          if (!isOwner) {
            return reply.code(403).send({ success: false, message: 'Você não tem acesso a esta turma.' });
          }
        }

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

  typedFastify.get(
    '/professor/analytics',
    {
      preHandler: [fastify.authorize(['professor'])],
      schema: {
        querystring: z.object({
          turmaId: z.string(),
        }),
        response: {
          200: z.object({ success: z.literal(true), data: professorAnalyticsSchema }),
          '4xx': z.object({ success: z.literal(false), message: z.string() }),
          '5xx': z.object({ success: z.literal(false), message: z.string() })
        }
      }
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const professorId = request.user.id;
        const { turmaId } = request.query;
        const analytics = await reportsService.getProfessorAnalytics(tenantId, professorId, turmaId);
        reply.send({ success: true, data: analytics });
      } catch (error: Error | unknown) {
        reply.code(500).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao carregar analytics do professor'
        });
      }
    }
  );

  typedFastify.get(
    '/turmas/:turmaId/boletins/export',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria'])],
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
        const { turmaId } = request.params;
        const { year } = request.query;
        
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
  typedFastify.get(
    '/notas/boletim/aluno/:alunoId',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria', 'professor'])],
      schema: {
        params: z.object({ alunoId: z.string() }),
        querystring: z.object({
          year: z.coerce.number().int().default(() => new Date().getFullYear()),
        }),
        response: {
          200: z.object({ success: z.literal(true), data: boletimIndividualSchema }),
          '4xx': z.object({ success: z.literal(false), message: z.string() }),
          '5xx': z.object({ success: z.literal(false), message: z.string() })
        }
      }
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const { alunoId } = request.params;
        const { year } = request.query;
        
        const boletim = await reportsService.getBoletimIndividual(tenantId, alunoId, year);
        reply.send({ success: true, data: boletim });
      } catch (error: Error | unknown) {
        reply.code(500).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao gerar boletim individual',
        });
      }
    }
  );
};
