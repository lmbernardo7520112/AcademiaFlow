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

/**
 * Strict bimestral slot DTO.
 * - periodo: explicit 1-4 identifier (not array index)
 * - valor: number | null (null = absence, 0 = mathematical zero)
 * - label: human-readable label from shared bimester constants
 */
export const bimestreSlotSchema = z.object({
  periodo: z.number().int().min(1).max(4),
  valor: z.number().nullable(),
  label: z.string(),
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
  /** Strict 4-slot bimestral performance array. Always 4 elements, ordered 1→4. */
  performanceBimestral: z.array(bimestreSlotSchema).length(4),
});

export const professorAnalyticsSchema = z.object({
  context: z.object({
    turmaId: z.string(),
    turmaName: z.string().optional(),
  }),
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
