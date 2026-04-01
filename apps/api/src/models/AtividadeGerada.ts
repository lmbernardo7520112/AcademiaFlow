import mongoose, { Schema } from 'mongoose';
import { AI_PROVIDERS } from '@academiaflow/shared';

const atividadeGeradaSchema = new Schema(
  {
    professorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    },
    topic: {
      type: String,
      required: true,
    },
    objective: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    providerStats: {
      provider: { type: String, enum: AI_PROVIDERS, required: true },
      model: { type: String, required: true },
      latencyMs: { type: Number, required: true },
      promptTokens: { type: Number },
      completionTokens: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

export const AtividadeGeradaModel = mongoose.model('AtividadeGerada', atividadeGeradaSchema);
