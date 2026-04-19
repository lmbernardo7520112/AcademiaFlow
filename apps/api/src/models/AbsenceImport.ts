import mongoose, { Schema } from 'mongoose';

const absenceImportSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    rawText: {
      type: String,
      required: true,
    },
    previewHash: {
      type: String,
      default: null,
    },
    serverHash: {
      type: String,
      default: null,
    },
    hashMatch: {
      type: Boolean,
      default: null,
    },
    casesCreated: {
      type: Number,
      default: 0,
    },
    warnings: [
      {
        type: { type: String },
        message: String,
        rawLine: String,
      },
    ],
    stats: {
      totalEntries: { type: Number, default: 0 },
      withPhone: { type: Number, default: 0 },
      withoutPhone: { type: Number, default: 0 },
      justified: { type: Number, default: 0 },
      transfers: { type: Number, default: 0 },
    },

    // ─── Versioning / Replace Audit ────────────────────────────
    version: {
      type: Number,
      default: 1,
    },
    previousRawText: {
      type: String,
      default: null,
    },
    replacedAt: {
      type: Date,
      default: null,
    },
    replacedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    importedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: one import per tenant per day
absenceImportSchema.index({ tenantId: 1, date: 1 }, { unique: true });

export const AbsenceImportModel = mongoose.model('AbsenceImport', absenceImportSchema);
