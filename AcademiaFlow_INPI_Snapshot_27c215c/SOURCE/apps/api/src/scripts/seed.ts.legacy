import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the local `.env` from apps/api
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { UserModel } from '../models/User.js';
import { TurmaModel } from '../models/Turma.js';
import { DisciplinaModel } from '../models/Disciplina.js';
import { AlunoModel } from '../models/Aluno.js';
import { NotaModel } from '../models/Nota.js';
// We'll use mocked argon2 hashes or create them cleanly through the auth service if available, 
// but directly passing passwords might just fail if the Mongoose hook does not hash. 
import * as argon2 from 'argon2';

async function seed() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error('❌ DATABASE_URL missing from environment');
    process.exit(1);
  }

  try {
    console.log('🌱 Connecting to database...');
    await mongoose.connect(uri);

    // 1. Clear existing database for a fresh start
    console.log('🧹 Formatting database...');
    await Promise.all([
      UserModel.deleteMany({}),
      TurmaModel.deleteMany({}),
      DisciplinaModel.deleteMany({}),
      AlunoModel.deleteMany({}),
      NotaModel.deleteMany({}),
    ]);

    const tenantIdStr = new mongoose.Types.ObjectId().toString();

    // 2. Create Default Admins and Professors
    console.log('👤 Creating predefined users...');
    
    // The UserModel has no pre-save hook for argon2 by default in v2 unless manually added,
    // let's create hashes explicitly here just to be safe.
    const defaultPassword = await argon2.hash('123456');

    await UserModel.create({
      tenantId: tenantIdStr,
      name: 'Leonardo Bernardo',
      email: 'admin@academiaflow.com',
      password: defaultPassword,
      role: 'administrador',
    });

    await UserModel.create({
      tenantId: tenantIdStr,
      name: 'Secretaria Escolar',
      email: 'secretaria@academiaflow.com',
      password: defaultPassword,
      role: 'secretaria',
    });
    
    const profA = await UserModel.create({
      tenantId: tenantIdStr,
      name: 'Marina Souza',
      email: 'marina.prof@academiaflow.com',
      password: defaultPassword,
      role: 'professor',
    });

    const profB = await UserModel.create({
      tenantId: tenantIdStr,
      name: 'Carlos Mendes',
      email: 'carlos.prof@academiaflow.com',
      password: defaultPassword,
      role: 'professor',
    });

    // 3. Create active Turmas
    console.log('🏫 Creating turmas...');
    const turma1 = await TurmaModel.create({ 
      tenantId: tenantIdStr, 
      name: '3º Ano Médio A', 
      year: new Date().getFullYear(), 
      periodo: 'vespertino',
      professorId: profA._id,
    });
    const turma2 = await TurmaModel.create({ 
      tenantId: tenantIdStr, 
      name: '9º Ano Fundamental B', 
      year: new Date().getFullYear(), 
      periodo: 'matutino',
      professorId: profB._id, 
    });

    // 4. Create core Disciplinas
    console.log('📚 Creating disciplinas curriculares com códigos...');
    const discMath = await DisciplinaModel.create({ tenantId: tenantIdStr, name: 'Matemática', codigo: 'MAT-301', professorId: profB._id, turmaId: turma1._id, cargaHoraria: 80 });
    const discBio = await DisciplinaModel.create({ tenantId: tenantIdStr, name: 'Biologia', codigo: 'BIO-101', professorId: profA._id, turmaId: turma1._id, cargaHoraria: 60 });
    await DisciplinaModel.create({ tenantId: tenantIdStr, name: 'História', codigo: 'HIS-201', professorId: profA._id, turmaId: turma2._id, cargaHoraria: 60 });

    // 5. Create 30+ students
    console.log('🎓 Seeding students...');
    const alunosList = [];
    const nomesFalsos = ['Ana', 'Bruno', 'Carlos', 'Diego', 'Eduarda', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia', 'Caio', 'Lara', 'Marcos', 'Nina', 'Otávio', 'Paula', 'Quintino', 'Rafael', 'Sara', 'Thiago', 'Ursula', 'Vitor', 'William', 'Xuxa', 'Yuri', 'Zelia', 'Alice', 'Bento', 'Camila', 'Daniel', 'Elisa', 'Fabio', 'Gabriela'];
    
    for (let i = 0; i < nomesFalsos.length; i++) {
        // Some students transferidos/abandono
        const isTransferido = i === 5;
        const isAbandono = i === 10;
        
        const aluno = await AlunoModel.create({
           tenantId: tenantIdStr,
           name: nomesFalsos[i] + ' Silva',
           email: `aluno${i}@escola.com`,
           matricula: `MAT-${10020 + i}`,
           turmaId: i % 2 === 0 ? turma1._id : turma2._id,
           dataNascimento: new Date(2005, Math.floor(Math.random() * 11), Math.floor(Math.random() * 28) + 1),
           transferido: isTransferido,
           abandono: isAbandono,
           isActive: !(isTransferido || isAbandono),
           valorMensalidade: i % 3 === 0 ? 450 : 680,
           vencimentoDia: 5 + (i % 5)
        });
        alunosList.push(aluno);
    }

    // 6. Generate random Grades (Notas) for Alunos
    console.log('📝 Injecting random grades...');
    const notasList = [];
    // Just inject grades for a subset to keep it realistic
    for (const aluno of alunosList) {
       // Skip inactive students from getting grades this term explicitly, though in real life they might have partial grades
       if (!aluno.isActive) continue;

       const baseGrades = [
         [8, 7, 6, 8], // Good student
         [4, 5, 4, 3], // Bad student (needs PF)
         [9, 9, 8, 10], // Excellent
         [6, 5, 6, 5] // Average barely passing (with PF)
       ];

       const mathPattern = baseGrades[Math.floor(Math.random() * baseGrades.length)] as (number | null)[];
       
       for (let b = 0; b < 4; b++) {
          const val = mathPattern[b];
          if (val !== null && val !== undefined) {
            notasList.push({
               tenantId: tenantIdStr,
               alunoId: aluno._id,
               disciplinaId: discMath._id,
               turmaId: aluno.turmaId,
               bimester: b + 1,
               year: new Date().getFullYear(),
               value: Math.min(10, val + (Math.random() * 1.5)), // add random modifier
            });
          }
       }

       // Generate PF if they are failing Math (roughly sum < 24)
       const mathSum = mathPattern.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0;
       if (mathSum < 24 && mathPattern[3] !== null) {
         notasList.push({
           tenantId: tenantIdStr,
           alunoId: aluno._id,
           disciplinaId: discMath._id,
           turmaId: aluno.turmaId,
           bimester: 5, // PF
           year: new Date().getFullYear(),
           value: 6.5 + (Math.random() * 2)
         });
       }

       // BIO grades (Randomized)
       for (const bimester of [1, 2, 3, 4]) {
          notasList.push({
             tenantId: tenantIdStr,
             alunoId: aluno._id,
             disciplinaId: discBio._id,
             turmaId: aluno.turmaId,
             bimester,
             year: new Date().getFullYear(),
             value: parseFloat((Math.random() * 4 + 6).toFixed(1)), // random 6.0 - 10.0
          });
       }
    }

    // Filter values to be strictly > 10 (random modifier can push above 10)
    for (const nota of notasList) {
       if (nota.value > 10) nota.value = 10;
       nota.value = parseFloat(nota.value.toFixed(1));
    }

    await NotaModel.insertMany(notasList);

    console.log('✅ Seed Script Finished Successfully!');
    console.log('👉 Use email: admin@academiaflow.com | pasword: 123456');
    console.log('👉 Emulated Tenant:', tenantIdStr);
    process.exit(0);
  } catch (error) {
    console.error('❌ SEED FAILED:', error);
    process.exit(1);
  }
}

seed();
