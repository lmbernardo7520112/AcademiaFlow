import mongoose, { Schema } from 'mongoose';

const disciplinaSchema = new Schema(
  {
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
