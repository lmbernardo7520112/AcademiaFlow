import fp from 'fastify-plugin';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { DisciplinaModel } from '../models/Disciplina.js';

type ResourceType = 'turma' | 'nota' | 'aluno';

declare module 'fastify' {
  interface FastifyInstance {
    checkOwnership: (resourceType: ResourceType) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Ownership Middleware — v1.2.0 Security Hardening
 * 
 * Enforces resource ownership for professors:
 * - admin / administrador / secretaria → full tenant access (pass-through)
 * - professor → only resources linked to their disciplines
 * 
 * Decorated as fastify.checkOwnership(resourceType) for DRY usage in routes.
 */
export default fp(async (fastify) => {
  fastify.decorate('checkOwnership', (resourceType: ResourceType) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const { role, id: userId, tenantId } = request.user;

      // Admin/secretaria have full tenant access
      if (['admin', 'administrador', 'secretaria'].includes(role)) {
        return; // pass-through
      }

      // Professor: check if they have disciplines linked to the resource
      if (role === 'professor') {
        // Find all disciplines this professor teaches
        const professorDisciplines = await DisciplinaModel.find({
          professorId: userId,
          tenantId,
        }).select('_id turmaIds').lean();

        if (professorDisciplines.length === 0) {
          return reply.code(403).send({
            success: false,
            message: 'Acesso negado: você não possui disciplinas vinculadas',
          });
        }

        if (resourceType === 'turma') {
          const { id: turmaId } = request.params as { id: string };
          // Check if any of the professor's disciplines are in this turma
          const hasAccess = professorDisciplines.some(d =>
            d.turmaIds?.some(tId => String(tId) === turmaId)
          );

          if (!hasAccess) {
            return reply.code(403).send({
              success: false,
              message: 'Acesso negado: você não leciona nesta turma',
            });
          }
        }

        if (resourceType === 'nota') {
          const { id: notaId } = request.params as { id: string };
          // Lazy import to avoid circular dependency
          const { NotaModel } = await import('../models/Nota.js');
          const nota = await NotaModel.findOne({ _id: notaId, tenantId }).select('disciplinaId').lean();

          if (!nota) {
            return reply.code(404).send({
              success: false,
              message: 'Nota não encontrada',
            });
          }

          const hasAccess = professorDisciplines.some(d =>
            String(d._id) === String(nota.disciplinaId)
          );

          if (!hasAccess) {
            return reply.code(403).send({
              success: false,
              message: 'Acesso negado: esta nota pertence a outra disciplina',
            });
          }
        }

        if (resourceType === 'aluno') {
          // Professor can access alunos enrolled in turmas they teach
          const linkedTurmaIds = professorDisciplines.flatMap(d =>
            (d.turmaIds || []).map(tId => String(tId))
          );
          const { id: alunoId } = request.params as { id: string };
          const { AlunoModel } = await import('../models/Aluno.js');
          const aluno = await AlunoModel.findOne({ _id: alunoId, tenantId }).select('turmaId').lean();

          if (!aluno || !linkedTurmaIds.includes(String(aluno.turmaId))) {
            return reply.code(403).send({
              success: false,
              message: 'Acesso negado: este aluno não pertence às suas turmas',
            });
          }
        }
      }
    };
  });
});
