import mongoose, { Schema } from 'mongoose';

const siageDisciplinaAliasSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    /** Name as it appears in SIAGE (e.g. "Biologia") */
    siageName: {
      type: String,
      required: true,
      trim: true,
    },
    /** Normalized lowercase version for matching */
    siageNameNormalized: {
      type: String,
      required: true,
      index: true,
    },
    /** Reference to the local Disciplina in AcademiaFlow */
    disciplinaId: {
      type: Schema.Types.ObjectId,
      ref: 'Disciplina',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique alias per tenant: one SIAGE name maps to exactly one disciplina
siageDisciplinaAliasSchema.index(
  { tenantId: 1, siageNameNormalized: 1 },
  { unique: true },
);

export const SiageDisciplinaAliasModel = mongoose.model(
  'SiageDisciplinaAlias',
  siageDisciplinaAliasSchema,
);
