import mongoose, { Schema } from 'mongoose';

const feedbackEntrySchema = new Schema(
  {
    atividadeId: { type: Schema.Types.ObjectId, ref: 'AtividadeGerada', required: true },
    comentario: { type: String, required: true },
    qualidadeIA: { type: Number, min: 0, max: 10, required: true },
    data: { type: Date, default: Date.now },
  },
  { _id: false }
);

const validacaoPedagogicaSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
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
    atividadesValidadas: {
      type: Number,
      default: 0,
      min: 0,
    },
    feedbacks: {
      type: [feedbackEntrySchema],
      default: [],
    },
    ultimaValidacao: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

validacaoPedagogicaSchema.index({ tenantId: 1, professorId: 1, disciplinaId: 1 }, { unique: true });

export const ValidacaoPedagogicaModel = mongoose.model('ValidacaoPedagogica', validacaoPedagogicaSchema);
