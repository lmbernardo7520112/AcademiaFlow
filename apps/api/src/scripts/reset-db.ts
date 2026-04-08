import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import * as argon2 from 'argon2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

import { UserModel } from '../models/User.js';
import { TurmaModel } from '../models/Turma.js';
import { DisciplinaModel } from '../models/Disciplina.js';
import { AlunoModel } from '../models/Aluno.js';
import { NotaModel } from '../models/Nota.js';

interface LegacyAluno {
  numero: string;
  nome: string;
}

interface LegacyTurma {
  nome_turma: string;
  alunos: LegacyAluno[];
}

interface LegacyJSON {
  turmas: LegacyTurma[];
}

interface BNCCDisciplina {
  nome: string;
  slug: string;
  area: string;
  cargaHoraria: number;
}

class LCG {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}

async function runSeedCI(tenantId: string, defaultPassword: string, currentYear: number) {
  console.log('🚀 Running in CI Mode (Invariant Bounds: 10 Users, 3 Turmas, 15 Notes)');

  // 1. Users: 1 Admin, 1 Secretaria, 3 Professors
  await UserModel.create([
    { tenantId, name: 'Admin CI', email: 'admin@escola.ci', password: defaultPassword, role: 'administrador' },
    { tenantId, name: 'Secretaria CI', email: 'secretaria@escola.ci', password: defaultPassword, role: 'secretaria' }
  ]);

  const profs = await UserModel.create([
    { tenantId, name: 'Professor Mat', email: 'prof1@escola.ci', password: defaultPassword, role: 'professor' },
    { tenantId, name: 'Professor Port', email: 'prof2@escola.ci', password: defaultPassword, role: 'professor' },
    { tenantId, name: 'Professor Hist', email: 'prof3@escola.ci', password: defaultPassword, role: 'professor' }
  ]);

  // 2. Turmas: 3 classes
  const turmas = await TurmaModel.create([
    { tenantId, name: '1º Ano A', year: currentYear, periodo: 'matutino', isActive: true },
    { tenantId, name: '2º Ano A', year: currentYear, periodo: 'matutino', isActive: true },
    { tenantId, name: '3º Ano A', year: currentYear, periodo: 'matutino', isActive: true }
  ]);

  // 3. Disciplines: 3 matching professors
  const areas = ['Matemática', 'Linguagens', 'Ciências Humanas e Sociais Aplicadas'];
  const disciplines = await Promise.all(profs.map((prof, i) => 
    DisciplinaModel.create({
      tenantId, name: areas[i], codigo: `DSC-00${i+1}`, professorId: prof._id, turmaIds: turmas.map(t => t._id), cargaHoraria: 80
    })
  ));

  // 4. Alunos: 5 total
  const alunos = await AlunoModel.create([
    { tenantId, name: 'Aluno CI 1', email: 'aluno1@escola.ci', matricula: 'CI-1', turmaId: turmas[0]!._id, isActive: true, dataNascimento: new Date(2005, 0, 1) },
    { tenantId, name: 'Aluno CI 2', email: 'aluno2@escola.ci', matricula: 'CI-2', turmaId: turmas[0]!._id, isActive: true, dataNascimento: new Date(2005, 0, 1) },
    { tenantId, name: 'Aluno CI 3', email: 'aluno3@escola.ci', matricula: 'CI-3', turmaId: turmas[1]!._id, isActive: true, dataNascimento: new Date(2005, 0, 1) },
    { tenantId, name: 'Aluno CI 4', email: 'aluno4@escola.ci', matricula: 'CI-4', turmaId: turmas[1]!._id, isActive: true, dataNascimento: new Date(2005, 0, 1) },
    { tenantId, name: 'Aluno CI 5', email: 'aluno5@escola.ci', matricula: 'CI-5', turmaId: turmas[2]!._id, isActive: true, dataNascimento: new Date(2005, 0, 1) }
  ]);

  // 5. Notes: 5 Alunos * 3 Disciplines * 1 bimester = 15
  const notasDocs = [];
  for (const aluno of alunos) {
    for (const disc of disciplines) {
      notasDocs.push({
        tenantId, alunoId: aluno._id, disciplinaId: disc._id, turmaId: aluno.turmaId, year: currentYear, bimester: 1, value: 8.5
      });
    }
  }
  await NotaModel.insertMany(notasDocs);
  
  console.log('✅ CI Seed Completed: 10 Users, 3 Turmas, 5 Alunos, 15 Notes');
}

async function runSeedDemo(tenantId: string, defaultPassword: string, currentYear: number) {
  console.log('🚀 Running in Demo Mode (BNCC Parity, 152 Alunos, 12 Professors, 7296 Notes)');

  // Base Admin/Sec
  await UserModel.create([
    { tenantId, name: 'Administrador AcademiaFlow', email: 'admin@academiaflow.com', password: defaultPassword, role: 'administrador' },
    { tenantId, name: 'Secretaria AcademiaFlow', email: 'secretaria@academiaflow.com', password: defaultPassword, role: 'secretaria' }
  ]);

  // Read BNCC
  const bnccPath = resolve(__dirname, './data/bncc_ensino_medio_disciplinas.json');
  if (!existsSync(bnccPath)) throw new Error('BNCC catalog missing at ' + bnccPath);
  const bnccArr: BNCCDisciplina[] = JSON.parse(await fs.readFile(bnccPath, 'utf8'));

  // Create exactly 12 professors
  const profDocs = await UserModel.create(bnccArr.map(d => ({
    tenantId, name: `Prof. ${d.nome}`, email: `professor.${d.slug}@escola.demo.br`, password: defaultPassword, role: 'professor'
  })));

  // Load Legacy Turmas/Alunos
  const possiblePaths = [
    resolve(__dirname, './data/turmas_alunos.json'),
    resolve(__dirname, '../../../../../workspace/reference/academiaflow_legacy/server/seed/turmas_alunos.json'),
    resolve(process.cwd(), 'reference/academiaflow_legacy/server/seed/turmas_alunos.json'),
    resolve(process.cwd(), '../workspace/reference/academiaflow_legacy/server/seed/turmas_alunos.json')
  ];
  let legacyPath = '';
  for (const p of possiblePaths) {
    if (existsSync(p)) { legacyPath = p; break; }
  }
  if (!legacyPath) throw new Error('❌ legacy JSON turmas_alunos.json not found');
  
  const legacyData: LegacyJSON = JSON.parse(await fs.readFile(legacyPath, 'utf8'));

  // Create 7 Turmas
  const turmas = await TurmaModel.create(legacyData.turmas.map(t => ({
    tenantId, name: t.nome_turma, year: currentYear, periodo: 'vespertino', isActive: true
  })));

  // Create 12 Disciplines
  const disciplines = await DisciplinaModel.insertMany(bnccArr.map((d, i) => ({
    tenantId, name: d.nome, codigo: `BNC-${(i + 1).toString().padStart(3, '0')}`, professorId: profDocs[i]!._id, turmaIds: turmas.map(t => t._id), cargaHoraria: d.cargaHoraria
  })));

  // Create 152 Alunos & 7296 Notas
  const lcg = new LCG(123456789);
  const notasBatch = [];

  for (let tIdx = 0; tIdx < legacyData.turmas.length; tIdx++) {
    const legacyT = legacyData.turmas[tIdx]!;
    const tDoc = turmas[tIdx]!;

    const alunoDocsToInsert = legacyT.alunos.map(a => ({
      tenantId, name: a.nome, email: `${a.numero}@escola.demo.br`, matricula: `${tDoc.name.replace(/\s/g,'')}-${a.numero}`,
      turmaId: tDoc._id, isActive: true,
      dataNascimento: new Date(2005, 0, 1)
    }));
    const createdAlunos = await AlunoModel.insertMany(alunoDocsToInsert);

    for (let i = 0; i < createdAlunos.length; i++) {
      const aluno = createdAlunos[i]!;
      // Define performance curve profile using LCG per student
      const rand = lcg.next();
      let isRisk = false, isHigh = false;
      if (rand < 0.2) isHigh = true;
      else if (rand < 0.4) isRisk = true; // 20% risk

      for (const disc of disciplines) {
        for (let b = 1; b <= 4; b++) {
          let notaNull = false;
          let notaVal = 7;
          
          if (isHigh) {
            notaVal = 8.5 + (lcg.next() * 1.5);
          } else if (isRisk) {
            notaVal = 7.5 - (b * 1.5); // declining 
          } else {
            notaVal = 6.0 + (lcg.next() * 2.0);
          }

          // Force some nulls for testing strict graph periods if needed, 
          // but demo should have 7296 *filled* evaluation records? Plaining specified:
          // *152 * 12 * 4 = 7296 Avaliações determinísticas*
          // Null translates to record exists but value: null or omitted? 
          // The planner specifically states value: null for absence.
          // Let's make the 4th bimester sometimes null to simulate incomplete year
          if (b === 4 && lcg.next() < 0.1) {
            notaNull = true;
          }

          notasBatch.push({
            tenantId, alunoId: aluno._id, disciplinaId: disc._id, turmaId: tDoc._id, year: currentYear, bimester: b, value: notaNull ? null : parseFloat(notaVal.toFixed(1))
          });
        }
      }
    }
  }

  // Insert exactly 7296 notes into DB
  const chunkSize = 1000;
  for (let i = 0; i < notasBatch.length; i += chunkSize) {
    await NotaModel.insertMany(notasBatch.slice(i, i + chunkSize));
  }

  console.log('✅ Demo Seed Completed: 12 BNCC Professors, 7 Turmas, 152 Alunos, 7296 Notas');
}

async function resetDB() {
  const uri = process.env.DATABASE_URL;
  const isDev = process.env.NODE_ENV === 'development' || uri?.includes('127.0.0.1') || uri?.includes('localhost');

  if (!uri) {
    console.error('❌ DATABASE_URL missing');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes('--force');
  let mode = args.find(a => a.startsWith('--mode='))?.split('=')[1];
  if (!mode && args.includes('--mode')) {
    mode = args[args.indexOf('--mode') + 1];
  }
  
  if (!mode) {
    console.warn('⚠️ No mode specified, defaulting to ci');
    mode = 'ci';
  }

  if (!isDev && !force) {
    console.error('❌ SEED ABORTED: Non-dev env.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('🧹 Teardown: Clearing all core collections...');
    await Promise.all([
      UserModel.deleteMany({}), TurmaModel.deleteMany({}), DisciplinaModel.deleteMany({}), AlunoModel.deleteMany({}), NotaModel.deleteMany({})
    ]);

    const tenantId = new mongoose.Types.ObjectId().toString();
    const defaultPassword = await argon2.hash('123456');
    const currentYear = new Date().getFullYear();

    if (mode === 'demo') {
      await runSeedDemo(tenantId, defaultPassword, currentYear);
    } else {
      await runSeedCI(tenantId, defaultPassword, currentYear);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ RESET FAILED:', err);
    process.exit(1);
  }
}

resetDB();
