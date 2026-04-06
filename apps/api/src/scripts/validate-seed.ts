import mongoose from 'mongoose';
import fs from 'fs';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { AlunoModel } from '../models/Aluno.js';
import { TurmaModel } from '../models/Turma.js';
import { DisciplinaModel } from '../models/Disciplina.js';
import { NotaModel } from '../models/Nota.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the local .env from apps/api
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function validate() {
  console.log('🔍 Iniciando Auditoria Estrita de Paridade de Dados (V5 Forensic Validation)...');
  
  try {
    const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
    if (!uri) throw new Error('DATABASE_URL missing');
    
    await mongoose.connect(uri);
    
    // Portabilidade: Localizar turmas_alunos.json
    const possiblePaths = [
      resolve(__dirname, './data/turmas_alunos.json'),
      resolve(__dirname, '../../../../../workspace/reference/academiaflow_legacy/server/seed/turmas_alunos.json'),
      resolve(process.cwd(), 'reference/academiaflow_legacy/server/seed/turmas_alunos.json'),
      resolve(process.cwd(), '../workspace/reference/academiaflow_legacy/server/seed/turmas_alunos.json'),
      resolve(process.cwd(), 'apps/api/src/data/turmas_alunos.json')
    ];
    
    let legacyPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        legacyPath = p;
        break;
      }
    }

    if (!legacyPath) {
      throw new Error('❌ legacy JSON not found. Check portability.');
    }

    const legacyRaw = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
    const legacyTurmas = legacyRaw.turmas || [];
    
    // 1. Validar Turmas
    const dbTurmas = await TurmaModel.countDocuments({ isActive: true });
    const legacyTurmasCount = legacyTurmas.length;
    
    console.log(`\n--- TURMAS ---`);
    console.log(`Legado: ${legacyTurmasCount}`);
    console.log(`Banco:  ${dbTurmas}`);
    
    if (dbTurmas !== legacyTurmasCount) {
      throw new Error('❌ Disparidade fatal na contagem de turmas!');
    }

    // 2. Validar Alunos
    const dbAlunos = await AlunoModel.countDocuments({ isActive: true });
    interface LegacyTurmaWithAlunos { alunos?: unknown[] }
    const legacyAlunosCount = (legacyTurmas as LegacyTurmaWithAlunos[]).reduce((acc: number, curr) => acc + (curr.alunos?.length || 0), 0);
    
    console.log(`\n--- ALUNOS ---`);
    console.log(`Legado: ${legacyAlunosCount}`);
    console.log(`Banco:  ${dbAlunos}`);
    
    if (dbAlunos !== legacyAlunosCount) {
      throw new Error('❌ Disparidade fatal na contagem de alunos!');
    }

    // 3. Validar Disciplinas (Paradoxo 11/12)
    const dbDisciplinas = await DisciplinaModel.countDocuments({ isActive: true });
    // No legado, criávamos 12, mas vinculávamos 11.
    console.log(`\n--- DISCIPLINAS ---`);
    console.log(`Esperado (Legacy Audit): 12 criadas`);
    console.log(`Banco: ${dbDisciplinas}`);

    if (dbDisciplinas !== 12) {
      throw new Error('❌ Disparidade na contagem de disciplinas (Esperado: 12)!');
    }

    // 4. Validar Vínculos (11 disciplinas por turma)
    console.log(`\n--- VÍNCULOS (1:N) ---`);
    const turmasDocs = await TurmaModel.find({});
    for (const t of turmasDocs) {
      const vinculadas = await DisciplinaModel.countDocuments({ turmaIds: t._id });
      console.log(`Turma [${t.name}]: ${vinculadas} disciplinas vinculadas`);
      if (vinculadas !== 11) {
        throw new Error(`❌ Turma [${t.name}] tem ${vinculadas} disciplinas (Esperado: 11)!`);
      }
    }

    // 5. Validar Notas (StudentCount * 11 * 4)
    const dbNotas = await NotaModel.countDocuments({});
    const expectedNotas = legacyAlunosCount * 11 * 4;
    console.log(`\n--- NOTAS INICIAIS ---`);
    console.log(`Esperado: ${expectedNotas} (Alunos * 11 disc * 4 bim)`);
    console.log(`Banco: ${dbNotas}`);

    if (dbNotas !== expectedNotas) {
      throw new Error('❌ Disparidade na contagem de notas iniciais!');
    }

    console.log('\n✅ AUDITORIA FINALIZADA: Paridade Legacy 100% Confirmada.');

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('\n❌ AUDITORIA FALHOU:', errorMessage);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

validate();
