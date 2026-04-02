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
