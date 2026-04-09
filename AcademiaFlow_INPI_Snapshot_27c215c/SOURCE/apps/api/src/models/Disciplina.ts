import mongoose, { Schema } from 'mongoose';

const disciplinaSchema = new Schema(
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
    codigo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z]{2,4}-\d{3}$/,
    },
    professorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    turmaIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Turma',
      default: [],
    }],
    cargaHoraria: {
      type: Number,
      min: 10,
      max: 400,
      default: 60,
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

export const DisciplinaModel = mongoose.model('Disciplina', disciplinaSchema);
