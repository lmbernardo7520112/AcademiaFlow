import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyInstance } from 'fastify';
import {
  analyzeStudentPayloadSchema,
  validacaoPedagogicaHistorySchema
} from '@academiaflow/shared';
import { AIEngineService } from './ai.service.js';
import { GeminiProvider } from './providers/GeminiProvider.js';
import { MockLLMProvider } from './providers/MockLLMProvider.js';

import { z } from 'zod';
import { iaPedagogicoService } from './ia_pedagogico.service.js';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

export const aiRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();
  
  // Instalação do Inversor de Dependência: Em testes, roda a classe Falsa (Custo Zero), Senão sobe a Real!
  const isTestEnv = process.env.NODE_ENV === 'test';
  const llmProvider = isTestEnv ? new MockLLMProvider() : new GeminiProvider();
  const aiService = new AIEngineService(llmProvider);
  
  // Sincronizar o serviço pedagógico com o provider (Mock ou Real)
  iaPedagogicoService.setProvider(llmProvider);

  // Autenticação Global do endpoint
  typedFastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));

  typedFastify.post(
    '/generate-activity',
    {
      // Apenas professores e cargos administrativos podem gerar atividades B2B
      preHandler: [fastify.authorize(['admin', 'secretaria', 'professor'])],
      schema: { body: analyzeStudentPayloadSchema },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const payload = request.body;
        const generatedActivity = await aiService.generateActivity(tenantId, payload);
        reply.code(200).send({ success: true, data: generatedActivity });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao tentar acionar o motor de inteligência artificial',
        });
      }
    }
  );

  const analysisBodySchema = z.object({
    bimester: z.number().min(1).max(5),
    year: z.number(),
    disciplinaId: z.string()
  });

  // IA Reactor 2.0: Validação Pedagógica (Análise)
  typedFastify.post(
    '/pedagogical/analysis',
    {
      schema: {
        body: analysisBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const { bimester, year, disciplinaId } = request.body;
        const analysis = await iaPedagogicoService.generatePerformanceAnalysis(tenantId, bimester, year, disciplinaId);
        reply.send({ success: true, data: analysis });
      } catch (error: Error | unknown) {
        console.error('\n--- ERRO IA PEDAGOGICAL ANALYSIS ---');
        console.error(error instanceof Error ? error.message : 'Erro genérico');
        console.error(error instanceof Error ? error.stack : 'Sem stack');
        reply.code(500).send({ 
          success: false, 
          message: error instanceof Error ? error.message : 'Erro interno na análise IA',
          debug: error instanceof Error ? error.stack : undefined
        });
      }
    }
  );

  // IA Reactor 2.0: Geração de Exercícios (Recuperação)
  typedFastify.post(
    '/pedagogical/exercises',
    {
      schema: {
        body: analysisBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const { bimester, year, disciplinaId } = request.body;
        const result = await iaPedagogicoService.generateRecoveryExercises(tenantId, bimester, year, disciplinaId);
        reply.send({ success: true, data: result });
      } catch (error: unknown) {
        reply.code(500).send({ success: false, message: error instanceof Error ? error.message : 'Erro interno na geração IA' });
      }
    }
  );

  typedFastify.get(
    '/pedagogical/history',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria', 'professor'])],
      schema: {
        querystring: validacaoPedagogicaHistorySchema
      }
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const userId = request.user.id;
        const role = request.user.role;
        const filters = request.query;

        const result = await iaPedagogicoService.listHistory(tenantId, filters, userId, role);
        reply.send({ success: true, ...result });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao listar histórico de IA',
        });
      }
    }
  );

  typedFastify.delete(
    '/pedagogical/:id',
    {
      preHandler: [fastify.authorize(['admin', 'secretaria', 'professor'])],
      schema: {
        params: z.object({
          id: z.string()
        })
      }
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const userId = request.user.id;
        const role = request.user.role;
        const { id } = request.params;

        const result = await iaPedagogicoService.deleteAnalysis(tenantId, id, userId, role);
        reply.send(result);
      } catch (error: Error | unknown) {
        // Normalização de erro para 404 se não encontrado ou sem permissão (Security mapping)
        const message = error instanceof Error ? error.message : 'Erro ao excluir análise';
        const code = message.includes('não encontrada') ? 404 : 400;
        reply.code(code).send({
          success: false,
          message
        });
      }
    }
  );
};

