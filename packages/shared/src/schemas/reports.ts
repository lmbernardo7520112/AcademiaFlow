import { z } from 'zod';

export const metricsSchema = z.object({
  averageGrade: z.number().nullable(),
  approvalRate: z.number(),
  reprovadosRate: z.number(),
  recoveryRate: z.number(),
  totalStudents: z.number(),
});

export const reportCardAtRiskSchema = z.object({
  _id: z.string(),
  name: z.string(),
  average: z.number(),
});

export const turmaDashboardSchema = z.object({
  turmaId: z.string(),
  turmaName: z.string(),
  metrics: metricsSchema,
  distribution: z.array(
    z.object({
      range: z.string(),
      count: z.number(),
    })
  ),
  studentsAtRisk: z.array(reportCardAtRiskSchema).max(10),
});

export const professorAnalyticsSchema = z.object({
  context: z.object({
    turmaId: z.string().optional(),
    turmaName: z.string().optional(),
  }).optional(),
  globalAverage: z.number().nullable(),
  riskTotal: z.number(),
  classes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      average: z.number().nullable(),
      trend: z.enum(['up', 'down', 'stable']).optional(),
    })
  ),
});

export const turmasTaxasItemSchema = z.object({
  turmaId: z.string(),
  turmaName: z.string(),
  aprovados: z.number(),
  reprovados: z.number(), // Alinhado com o restante do projeto (Português)
  recuperacao: z.number(),
  taxaAprovacao: z.number(),
});

export const turmasTaxasResponseSchema = z.array(turmasTaxasItemSchema);

export type TurmaDashboard = z.infer<typeof turmaDashboardSchema>;
export type ProfessorAnalytics = z.infer<typeof professorAnalyticsSchema>;
export type TurmasTaxasResponse = z.infer<typeof turmasTaxasResponseSchema>;
