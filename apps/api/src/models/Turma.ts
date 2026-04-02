import mongoose, { Schema } from 'mongoose';
import { TURMA_PERIODOS } from '@academiaflow/shared';

const turmaSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
    },
    periodo: {
      type: String,
      enum: TURMA_PERIODOS,
      default: 'matutino',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const TurmaModel = mongoose.model('Turma', turmaSchema);
