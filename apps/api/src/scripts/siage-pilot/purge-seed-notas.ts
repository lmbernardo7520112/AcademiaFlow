#!/usr/bin/env tsx
/**
 * @module siage-pilot/purge-seed-notas
 *
 * Exclui as notas geradas pelo seed inicial (fake notes) do banco.
 * Requer Hard Stop 3 (dry-run por default, confirmação de banco e backup path).
 *
 * Usage:
 *   docker exec academiaflow_api npx tsx apps/api/src/scripts/siage-pilot/purge-seed-notas.ts \
 *     --turma="1º ANO A" \
 *     --bimester=1 \
 *     --backup-path=./backup.json \
 *     [--execute --confirm=academiaflow]
 */
import { connect, disconnect } from 'mongoose';
import { env } from '../../config/env.js';
import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { NotaModel } from '../../models/Nota.js';
import { TurmaModel } from '../../models/Turma.js';
import { DisciplinaModel } from '../../models/Disciplina.js';

async function main() {
  const { values } = parseArgs({
    options: {
      turma: { type: 'string' },
      bimester: { type: 'string' },
      disciplina: { type: 'string' },
      'backup-path': { type: 'string' },
      execute: { type: 'boolean', default: false },
      confirm: { type: 'string' },
    },
    strict: false,
  });

  console.log('═══════════════════════════════════════════════════');
  console.log('  SIAGE PILOT — PURGE (DESTRUCTIVE)');
  console.log('═══════════════════════════════════════════════════');
  
  // 1. Validate Env
  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not set.');
  }

  const dbMatch = dbUrl.match(/\/([^/?]+)(\?|$)/);
  const dbName = dbMatch ? dbMatch[1] : null;
  if (!dbName) throw new Error('Não foi possível inferir db-name da DATABASE_URL');
  
  console.log(`  Target DB:  ${dbName}`);
  console.log(`  Mode:       ${values.execute ? '🚨 EXECUTE' : '🔍 DRY-RUN'}`);

  // 2. Security Protocol (Hard Stop 3)
  if (values.execute) {
    if (values.confirm !== dbName) {
      throw new Error(`\n❌ Abort: --confirm=${values.confirm} não coincide com o db-name real (${dbName})`);
    }
    if (!values['backup-path'] || !existsSync(values['backup-path'] as string)) {
      throw new Error('\n❌ Abort: --backup-path inválido ou arquivo não existe.');
    }
  }

  if (!values.turma || !values.bimester) {
      throw new Error('\n❌ Abort: --turma e --bimester são obrigatórios nas ondas 1-2.');
  }

  await connect(env.DATABASE_URL);
  
  try {
    const bimester = parseInt(values.bimester as string, 10);
    const turma = await TurmaModel.findOne({ name: values.turma }).lean();
    if (!turma) throw new Error(`Turma não encontrada: ${values.turma}`);

    const query: Record<string, unknown> = {
      turmaId: turma._id,
      bimester,
    };
    if (values.disciplina) {
        const disciplina = await DisciplinaModel.findOne({ name: values.disciplina }).lean();
        if (!disciplina) throw new Error(`Disciplina não encontrada: ${values.disciplina}`);
        query.disciplinaId = disciplina._id;
    }

    const countBefore = await NotaModel.countDocuments(query);
    console.log(`\n📊 Notas no escopo antes do purge: ${countBefore}`);

    if (countBefore === 0) {
      console.log('❌ Zero notas. Abortando.');
      return;
    }

    if (!values.execute) {
      console.log('\n✅ DRY-RUN completo. Passe --execute --confirm=... --backup-path=... para purgar.');
      return;
    }

    console.log('\n⏳ Executando purge...');
    const result = await NotaModel.deleteMany(query);
    console.log(`✅ ${result.deletedCount} notas excluídas.`);

    const countAfter = await NotaModel.countDocuments(query);
    console.log(`📊 Notas no escopo após o purge: ${countAfter}`);
    
  } finally {
    await disconnect();
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
