import mongoose, { Schema } from 'mongoose';

const alunoSchema = new Schema(
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
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    matricula: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    turmaId: {
      type: Schema.Types.ObjectId,
      ref: 'Turma',
      required: true,
    },
    dataNascimento: {
      type: Date,
      required: true,
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

export const AlunoModel = mongoose.model('Aluno', alunoSchema);
