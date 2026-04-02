import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { analyzeStudentPayloadSchema } from '@academiaflow/shared';
import { AIEngineService } from './ai.service.js';
import { GeminiProvider } from './providers/GeminiProvider.js';
import { MockLLMProvider } from './providers/MockLLMProvider.js';

import { z } from 'zod';
import { iaPedagogicoService } from './ia_pedagogico.service.js';

// Instalação do Inversor de Dependência: Em testes, roda a classe Falsa (Custo Zero), Senão sobe a Real!
const isTestEnv = process.env.NODE_ENV === 'test';
const llmProvider = isTestEnv ? new MockLLMProvider() : new GeminiProvider();
const aiService = new AIEngineService(llmProvider);

export const aiRoutes: FastifyPluginAsyncZod = async (fastify: FastifyInstance) => {
  // Autenticação Global do endpoint
  fastify.addHook('onRequest', (request, reply) => fastify.authenticate(request, reply));

  fastify.post(
    '/generate-activity',
    {
      // Apenas professores e cargos administrativos podem gerar atividades B2B
      preHandler: [fastify.authorize(['admin', 'secretaria', 'professor'])],
      schema: { body: analyzeStudentPayloadSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user.tenantId;
        const payload = request.body as import('@academiaflow/shared').AnalyzeStudentPayload;
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

  // IA Reactor 2.0: Validação Pedagógica (Análise)
  fastify.post(
    '/pedagogical/analysis',
    {
      schema: {
        body: z.object({
          bimester: z.number().min(1).max(5),
          year: z.number(),
          disciplinaId: z.string()
        }),
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const { bimester, year, disciplinaId } = request.body as { bimester: number; year: number; disciplinaId: string };
        const analysis = await iaPedagogicoService.generatePerformanceAnalysis(tenantId, bimester, year, disciplinaId);
        reply.send({ success: true, data: analysis });
      } catch (error: any) {
        reply.code(500).send({ success: false, message: error.message });
      }
    }
  );

  // IA Reactor 2.0: Geração de Exercícios (Recuperação)
  fastify.post(
    '/pedagogical/exercises',
    {
      schema: {
        body: z.object({
          bimester: z.number().min(1).max(5),
          year: z.number(),
          disciplinaId: z.string()
        }),
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user.tenantId;
        const { bimester, year, disciplinaId } = request.body as { bimester: number; year: number; disciplinaId: string };
        const result = await iaPedagogicoService.generateRecoveryExercises(tenantId, bimester, year, disciplinaId);
        reply.send({ success: true, data: result });
      } catch (error: any) {
        reply.code(500).send({ success: false, message: error.message });
      }
    }
  );
};
