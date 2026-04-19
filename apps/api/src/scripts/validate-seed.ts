import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { AlunoModel } from '../models/Aluno.js';
import { TurmaModel } from '../models/Turma.js';
import { NotaModel } from '../models/Nota.js';
import { UserModel } from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the local .env from apps/api
dotenv.config({ path: resolve(__dirname, '../../.env') });

/**
 * Dynamic expectations derived from the actual turmas_alunos.json file.
 * This eliminates ALL hardcoded values (152, 7, 7296, etc.) and ensures
 * the validation always reflects the real data.
 */
function getExpectedCounts() {
  const dataPath = resolve(__dirname, './data/turmas_alunos.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  const expectedTurmas = data.turmas.length;
  const expectedAlunos = data.turmas.reduce(
    (sum: number, t: { alunos: unknown[] }) => sum + t.alunos.length, 0
  );
  // 12 BNCC disciplines × 4 bimesters per student
  const expectedNotasBase = expectedAlunos * 12 * 4;
  return { expectedTurmas, expectedAlunos, expectedNotasBase };
}

async function validateCI() {
  console.log('🔍 Executing strict validation for CI mode...');
  
  const users = await UserModel.countDocuments({});
  const alunosCount = await AlunoModel.countDocuments({});
  const total = users + alunosCount;
  console.assert(total === 10, `❌ Exatamente 10 contas necessárias no CI. Encontrado: ${total}`);
  if (total !== 10) throw new Error('Falha no Invariante CI: Usuários (Contas)');
  
  console.assert(users === 5, `❌ Exatamente 5 usuários (Admin, Secretaria, Professores) necessários. Encontrado: ${users}`);
  console.assert(alunosCount === 5, `❌ Exatamente 5 alunos necessários. Encontrado: ${alunosCount}`);

  const turmas = await TurmaModel.countDocuments({});
  console.assert(turmas === 3, `❌ Exatamente 3 turmas necessárias no CI. Encontradas: ${turmas}`);
  if (turmas !== 3) throw new Error('Falha no Invariante CI: Turmas');

  const notas = await NotaModel.countDocuments({});
  console.assert(notas === 15, `❌ Exatamente 15 notas/avaliações necessárias no CI. Encontradas: ${notas}`);
  if (notas !== 15) throw new Error('Falha no Invariante CI: Notas');

  console.log('✅ CI Invariants PASSED (10 Users, 3 Turmas, 15 Notas)');
}

async function validateDemo() {
  console.log('🔍 Executing strict validation for Demo (2026 Roster Parity) mode...');
  
  const { expectedTurmas, expectedAlunos, expectedNotasBase } = getExpectedCounts();
  console.log(`📋 Expected from turmas_alunos.json: ${expectedAlunos} Alunos, ${expectedTurmas} Turmas, ${expectedNotasBase} Base Notes`);
  
  const alunos = await AlunoModel.countDocuments({});
  console.assert(alunos === expectedAlunos, `❌ Exatamente ${expectedAlunos} alunos necessários (Paridade 2026 Roster). Encontrados: ${alunos}`);
  if (alunos !== expectedAlunos) throw new Error(`Falha no Invariante Demo: Alunos (expected ${expectedAlunos}, got ${alunos})`);

  const turmas = await TurmaModel.countDocuments({});
  console.assert(turmas === expectedTurmas, `❌ Exatamente ${expectedTurmas} turmas necessárias. Encontradas: ${turmas}`);
  if (turmas !== expectedTurmas) throw new Error(`Falha no Invariante Demo: Turmas (expected ${expectedTurmas}, got ${turmas})`);

  const professores = await UserModel.countDocuments({ role: 'professor' });
  console.assert(professores === 12, `❌ Exatamente 12 professores (BNCC) necessários. Encontrados: ${professores}`);
  if (professores !== 12) throw new Error('Falha no Invariante Demo: Professores');

  // Validate professor email domain
  const badEmails = await UserModel.countDocuments({
    role: 'professor',
    email: { $not: /@academiaflow\.com$/ },
  });
  console.assert(badEmails === 0, `❌ Todos os emails de professor devem ser @academiaflow.com. Encontrados ${badEmails} com domínio incorreto.`);
  if (badEmails > 0) throw new Error('Falha no Invariante Demo: Professor Email Domain');

  // Base notes: B1-B4 (alunos × 12 disciplinas × 4 bimestres)
  const notasBase = await NotaModel.countDocuments({ bimester: { $lte: 4 } });
  console.assert(notasBase === expectedNotasBase, `❌ Exatamente ${expectedNotasBase} notas base B1-B4 (${expectedAlunos}*12*4) necessárias. Encontradas: ${notasBase}`);
  if (notasBase !== expectedNotasBase) throw new Error(`Falha no Invariante Demo: Notas Base (expected ${expectedNotasBase}, got ${notasBase})`);

  // PF notes: bimester=5 for recovery-eligible students (MG ∈ [4.0, 6.0))
  const notasPF = await NotaModel.countDocuments({ bimester: 5 });
  console.assert(notasPF > 0, `❌ Ao menos 1 nota PF (bimester=5) esperada para paridade legado. Encontradas: ${notasPF}`);
  if (notasPF === 0) throw new Error('Falha no Invariante Demo: PF Parity (zero PF notes)');

  const notasTotal = await NotaModel.countDocuments({});
  console.assert(notasTotal === notasBase + notasPF, `❌ Total de notas inconsistente. Esperado: ${notasBase + notasPF}, Encontrado: ${notasTotal}`);

  console.log(`✅ Demo Invariants PASSED (${expectedAlunos} Alunos, ${expectedTurmas} Turmas, 12 Professores, ${notasTotal} Notas [${notasBase} base + ${notasPF} PF], All @academiaflow.com)`);
}

async function validate() {
  console.log('🔍 Iniciando Auditoria Estrita de Paridade de Dados (v1.2.0 Dynamic Validation)...');
  
  try {
    const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
    if (!uri) throw new Error('DATABASE_URL missing');
    
    await mongoose.connect(uri);

    const args = process.argv.slice(2);
    let mode = args.find(a => a.startsWith('--mode='))?.split('=')[1];
    if (!mode && args.includes('--mode')) {
      mode = args[args.indexOf('--mode') + 1];
    }
    
    if (!mode) {
      console.warn('⚠️ No mode specified for validation, defaulting to ci');
      mode = 'ci';
    }

    if (mode === 'demo') {
      await validateDemo();
    } else {
      await validateCI();
    }

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
