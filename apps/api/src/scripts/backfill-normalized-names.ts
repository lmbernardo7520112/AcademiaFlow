/**
 * Backfill script: normalizedName for all Aluno documents.
 *
 * Idempotent: only updates alunos where normalizedName is null or missing.
 * Safe to re-run multiple times.
 *
 * Usage:
 *   pnpm --filter @academiaflow/api backfill-names
 */
import mongoose from 'mongoose';
import { AlunoModel } from '../models/Aluno.js';

async function backfillNormalizedNames() {
  const mongoUri = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/academiaflow';

  console.log(`[backfill] Connecting to ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  const missing = await AlunoModel.countDocuments({
    $or: [
      { normalizedName: null },
      { normalizedName: { $exists: false } },
    ],
  });

  if (missing === 0) {
    console.log('[backfill] All alunos already have normalizedName. No-op.');
    await mongoose.disconnect();
    return;
  }

  console.log(`[backfill] Found ${missing} alunos without normalizedName. Updating...`);

  const cursor = AlunoModel.find({
    $or: [
      { normalizedName: null },
      { normalizedName: { $exists: false } },
    ],
  }).cursor();

  let updated = 0;
  for await (const aluno of cursor) {
    // Calling save() triggers the pre-save hook which computes normalizedName
    await aluno.save();
    updated++;
  }

  console.log(`[backfill] Done. Updated ${updated} alunos.`);

  // Validation
  const stillMissing = await AlunoModel.countDocuments({
    normalizedName: null,
    isActive: true,
  });

  if (stillMissing > 0) {
    console.error(`[backfill] WARNING: ${stillMissing} active alunos still without normalizedName!`);
    process.exitCode = 1;
  } else {
    console.log('[backfill] Validation passed: all active alunos have normalizedName.');
  }

  await mongoose.disconnect();
}

backfillNormalizedNames().catch((err) => {
  console.error('[backfill] Fatal error:', err);
  process.exit(1);
});
