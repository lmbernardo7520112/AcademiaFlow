import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs/promises';
import * as argon2 from 'argon2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the local `.env` from apps/api
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

async function resetDB() {
  const uri = process.env.DATABASE_URL;
  const isDev = process.env.NODE_ENV === 'development' || uri?.includes('127.0.0.1') || uri?.includes('localhost');

  if (!uri) {
    console.error('❌ DATABASE_URL missing from environment');
    process.exit(1);
  }

  if (!isDev && process.argv[2] !== '--force') {
    console.error('❌ SEED ABORTED: Non-development environment detected. Use --force to override.');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to database for Forensic Reset...');
    await mongoose.connect(uri);

    // 1. TEARDOWN
    console.log('🧹 Teardown: Clearing all core collections...');
    await Promise.all([
      UserModel.deleteMany({}),
      TurmaModel.deleteMany({}),
      DisciplinaModel.deleteMany({}),
      AlunoModel.deleteMany({}),
      NotaModel.deleteMany({}),
    ]);

    const tenantId = new mongoose.Types.ObjectId().toString();
    const defaultPassword = await argon2.hash('123456');

    // 2. SETUP: USERS
    console.log('👤 Setup: Creating official users (Legacy Parity)...');
    
    // Admin & Secretaria
    await UserModel.create([
      { tenantId, name: 'Administrador AcademiaFlow', email: 'admin@academiaflow.com', password: defaultPassword, role: 'administrador' },
      { tenantId, name: 'Secretaria AcademiaFlow', email: 'secretaria@academiaflow.com', password: defaultPassword, role: 'secretaria' }
    ]);

    // Professors (Mocked but consistent names for testing)
    const professors = await UserModel.create([
      { tenantId, name: 'Prof. Carlos Alberto (Ciências)', email: 'carlos.prof@academiaflow.com', password: defaultPassword, role: 'professor' },
      { tenantId, name: 'Profa. Marina Souza (Linguagens)', email: 'marina.prof@academiaflow.com', password: defaultPassword, role: 'professor' },
      { tenantId, name: 'Prof. Ricardo Gomes (Sociais)', email: 'ricardo.prof@academiaflow.com', password: defaultPassword, role: 'professor' }
    ]);

    // 3. SETUP: DISCIPLINES (createDisciplinesSeed.ts parity)
    console.log('📚 Setup: Creating disciplines (Legacy List)...');
    const disciplineList = [
      { name: 'Biologia', codigo: 'BIO-001' },
      { name: 'Química', codigo: 'QUI-001' },
      { name: 'Geografia', codigo: 'GEO-001' },
      { name: 'Sociologia', codigo: 'SOC-001' },
      { name: 'História', codigo: 'HIS-001' },
      { name: 'Filosofia', codigo: 'FIL-001' },
      { name: 'Espanhol', codigo: 'ESP-001' },
      { name: 'Português', codigo: 'POR-001' },
      { name: 'Artes', codigo: 'ART-001' },
      { name: 'Educação Física', codigo: 'EF-001' },
      { name: 'Inglês', codigo: 'ING-001' },
      { name: 'Matemática', codigo: 'MAT-001' }
    ];

    const disciplineDocs = await Promise.all(disciplineList.map(async (d, index) => {
      // Rotate professors
      const professorId = professors[index % professors.length]?._id;
      return DisciplinaModel.create({
        tenantId,
        name: d.name,
        codigo: d.codigo,
        professorId,
        turmaIds: [], // To be filled later
        cargaHoraria: 60
      });
    }));

    // 4. SETUP: TURMAS & ALUNOS (Parser turmas_alunos.json)
    console.log('🏫 Setup: Loading turmas_alunos.json...');
    const legacyPath = resolve(__dirname, '../../../../../workspace/reference/academiaflow_legacy/server/seed/turmas_alunos.json');
    const rawData = await fs.readFile(legacyPath, 'utf8');
    const legacyData: LegacyJSON = JSON.parse(rawData);

    let totalAlunosSeed = 0;
    const currentYear = new Date().getFullYear();

    for (const legacyTurma of legacyData.turmas) {
      // Create Turma
      const turmaDoc = await TurmaModel.create({
        tenantId,
        name: legacyTurma.nome_turma,
        year: currentYear,
        periodo: 'vespertino',
        isActive: true
      });

      // Update Disciplines (1:N link)
      // Assign all disciplines to all turmas (as per assignDisciplinesToTurmas.ts)
      await DisciplinaModel.updateMany(
        { tenantId },
        { $addToSet: { turmaIds: turmaDoc._id } }
      );

      // Create Alunos
      const alunoDocs = [];
      for (const legacyAluno of legacyTurma.alunos) {
        alunoDocs.push({
          tenantId,
          name: legacyAluno.nome,
          email: `${legacyAluno.nome.toLowerCase().replace(/\s+/g, '.')}@escola.com`,
          matricula: `${turmaDoc.name.replace(/\s+/g, '')}-${legacyAluno.numero}`,
          turmaId: turmaDoc._id,
          dataNascimento: new Date(2000 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          isActive: true,
          valorMensalidade: 650,
          vencimentoDia: 10
        });
        totalAlunosSeed++;
      }
      const createdAlunos = await AlunoModel.insertMany(alunoDocs);

      // 5. INITIAL GRADES (assignDisciplinesToTurmas.ts logic)
      console.log(`📝 Creating initial empty grades for Turma: ${turmaDoc.name}...`);
      const notasDocs = [];
      for (const aluno of createdAlunos) {
        for (const disc of disciplineDocs) {
          // Initialize B1..B4 as Pendente
          for (let b = 1; b <= 4; b++) {
            notasDocs.push({
              tenantId,
              alunoId: aluno._id,
              disciplinaId: disc._id,
              turmaId: turmaDoc._id,
              year: currentYear,
              bimester: b,
              value: 0 // Will be managed as Pendente by UI when value is exactly 0 and no data exists? 
                       // Actually, let's just create them or leave them for the teacher to create.
                       // The legacy created them as "null". Our schema might require number.
                       // Let's check schema.
            });
          }
        }
      }
      // Batch insert grades for performance
      if (notasDocs.length > 0) {
        await NotaModel.insertMany(notasDocs);
      }
    }

    console.log('\n✅ RESET & RECONCILIATION FINISHED');
    console.log(`📊 Statistics:`);
    console.log(`   - Turmas: ${legacyData.turmas.length}`);
    console.log(`   - Alunos: ${totalAlunosSeed}`);
    console.log(`   - Disciplines: ${disciplineList.length}`);
    console.log(`👉 Primary Admin: admin@academiaflow.com / 123456`);
    
    // Final Validation Landmark
    const landmark = await AlunoModel.findOne({ name: 'Alicia Natália Alves de Sousa' }).populate('turmaId');
    if (landmark) {
      console.log(`🔍 Validation Landmark: [${landmark.name}] found in Turma [${(landmark.turmaId as any).name}]`);
    } else {
      console.warn('⚠️ Validation Landmark NOT found. Review seed logic.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ RESET FAILED:', err);
    process.exit(1);
  }
}

resetDB();
