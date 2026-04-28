import mongoose, { Schema } from 'mongoose';

const MATCH_STATUSES = ['AUTO_MATCHED', 'MANUAL_PENDING', 'UNMATCHED', 'SKIPPED', 'RESOLVED', 'DISMISSED'] as const;
const IMPORT_STATUSES = ['imported', 'skipped', 'not_registered', 'error'] as const;
const UNMATCHED_REASONS = ['DOM_PLACEHOLDER', 'NO_LOCAL_STUDENT'] as const;

const siageRunItemSchema = new Schema(
  {
    runId: {
      type: Schema.Types.ObjectId,
      ref: 'SiageRun',
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      alunoName: { type: String, required: true },
      matriculaSiage: { type: String, required: false, default: '' },
      disciplinaName: { type: String, required: true },
      turmaName: { type: String, required: true },
      bimester: { type: Number, required: true },
      value: { type: Number, default: null },
    },
    matchResult: {
      alunoId: { type: Schema.Types.ObjectId, ref: 'Aluno', default: null },
      disciplinaId: { type: Schema.Types.ObjectId, ref: 'Disciplina', default: null },
      turmaId: { type: Schema.Types.ObjectId, ref: 'Turma', default: null },
      matchStatus: {
        type: String,
        enum: MATCH_STATUSES,
        required: true,
        default: 'UNMATCHED',
      },
      /** Sub-classification reason for UNMATCHED items */
      reason: {
        type: String,
        enum: [...UNMATCHED_REASONS, null],
        default: null,
      },
    },
    resolution: {
      resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      resolvedAt: { type: Date, default: null },
      action: {
        type: String,
        enum: ['link_aluno', 'link_disciplina', 'link_both', 'mark_pending', null],
        default: null,
      },
      previousStatus: { type: String, default: null },
    },
    importResult: {
      notaId: { type: Schema.Types.ObjectId, ref: 'Nota', default: null },
      status: {
        type: String,
        enum: IMPORT_STATUSES,
        default: null,
      },
      reason: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Fast lookup: items for a specific run
siageRunItemSchema.index({ runId: 1, 'matchResult.matchStatus': 1 });

export const SiageRunItemModel = mongoose.model('SiageRunItem', siageRunItemSchema);
