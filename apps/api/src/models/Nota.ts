import mongoose, { Schema } from 'mongoose';

const notaSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    alunoId: {
      type: Schema.Types.ObjectId,
      ref: 'Aluno',
      required: true,
    },
    disciplinaId: {
      type: Schema.Types.ObjectId,
      ref: 'Disciplina',
      required: true,
    },
    turmaId: {
      type: Schema.Types.ObjectId,
      ref: 'Turma',
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    bimester: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookups per report card
notaSchema.index({ alunoId: 1, disciplinaId: 1, year: 1, bimester: 1 }, { unique: true });

// Otimização para Agregações por Turma e Analytics de Desempenho
notaSchema.index({ tenantId: 1, turmaId: 1, value: 1 });

export const NotaModel = mongoose.model('Nota', notaSchema);
