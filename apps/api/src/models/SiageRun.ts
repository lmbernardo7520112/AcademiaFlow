import mongoose, { Schema } from 'mongoose';

const SIAGE_RUN_STATUSES = [
  'QUEUED', 'RUNNING', 'EXTRACTING', 'MATCHING', 'IMPORTING',
  'COMPLETED', 'FAILED', 'CANCELLED',
] as const;

const siageRunSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: SIAGE_RUN_STATUSES,
      required: true,
      default: 'QUEUED',
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
    turmaFilter: {
      type: String,
      default: null,
    },
    stats: {
      total: { type: Number, default: 0 },
      matched: { type: Number, default: 0 },
      imported: { type: Number, default: 0 },
      notRegistered: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

// Deduplication index: prevent concurrent runs for the same scope
// turmaFilter is normalized to "__ALL__" when null/empty at the service level
siageRunSchema.index(
  { tenantId: 1, year: 1, bimester: 1, turmaFilter: 1, status: 1 },
);

// Fast lookup by tenant + status for listing
siageRunSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export const SiageRunModel = mongoose.model('SiageRun', siageRunSchema);
