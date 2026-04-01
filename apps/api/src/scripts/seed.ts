import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the root `.env` manually since we are running isolated
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

import { UserModel } from '../models/User.js';
import { TurmaModel } from '../models/Turma.js';
import { DisciplinaModel } from '../models/Disciplina.js';
import { AlunoModel } from '../models/Aluno.js';
import { NotaModel } from '../models/Nota.js';

async function seed() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error('❌ DATABASE_URL missing from environment');
    process.exit(1);
  }

  try {
    console.log('🌱 Connecting to database...');
    await mongoose.connect(uri);

    // 1. Clear existing database for a fresh start (Optional, but great for seeding)
    console.log('🧹 Formatting database...');
    await Promise.all([
      UserModel.deleteMany({}),
      TurmaModel.deleteMany({}),
      DisciplinaModel.deleteMany({}),
      AlunoModel.deleteMany({}),
      NotaModel.deleteMany({}),
    ]);

    // 2. Create Default Admins and Professors
    console.log('👤 Creating default users...');
    await UserModel.create({
      name: 'Leonardo Bernardo',
      email: 'admin@academiaflow.com',
      password: 'password123', // Raw password, UserModel pre-save hook handles argon2 hashing
      role: 'admin',
    });
    
    await UserModel.create({
      name: 'Maria Eduarda',
      email: 'maria@academiaflow.com',
      password: 'password123',
      role: 'professor',
    });

    // 3. Create active Turmas
    console.log('🏫 Creating turmas...');
    const turma1 = await TurmaModel.create({ name: '1º Ano Médio A', year: new Date().getFullYear(), periodo: 'matutino' });
    const turma2 = await TurmaModel.create({ name: '2º Ano Médio B', year: new Date().getFullYear(), periodo: 'vespertino' });

    // 4. Create core Disciplinas
    console.log('📚 Creating disciplinas...');
    const discMath = await DisciplinaModel.create({ name: 'Matemática' });
    const discBio = await DisciplinaModel.create({ name: 'Biologia' });
    await DisciplinaModel.create({ name: 'História' });

    // 5. Create 10 dummy Students across Turmas
    console.log('🎓 Seeding students...');
    const alunosList = [];
    const nomesFalsos = ['Ana', 'Bruno', 'Carlos', 'Diego', 'Eduarda', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia'];
    
    for (let i = 0; i < 10; i++) {
        const aluno = await AlunoModel.create({
           name: nomesFalsos[i] + ' Silva',
           email: `aluno${i}@escola.com`,
           matricula: `MAT-${1000 + i}`,
           turmaId: i < 5 ? turma1._id : turma2._id,
           dataNascimento: new Date(2005, Math.floor(Math.random() * 11), Math.floor(Math.random() * 28) + 1),
        });
        alunosList.push(aluno);
    }

    // 6. Generate random Grades (Notas) for Alunos
    console.log('📝 Injecting random grades...');
    const notasList = [];
    for (const aluno of alunosList) {
       for (const bimester of [1, 2, 3, 4]) {
          // Mathematics Grades
          notasList.push({
             alunoId: aluno._id,
             disciplinaId: discMath._id,
             turmaId: aluno.turmaId,
             bimester,
             year: new Date().getFullYear(),
             value: parseFloat((Math.random() * 4 + 6).toFixed(1)), // random 6.0 - 10.0
          });
          
          // Biology Grades
          notasList.push({
             alunoId: aluno._id,
             disciplinaId: discBio._id,
             turmaId: aluno.turmaId,
             bimester,
             year: new Date().getFullYear(),
             value: parseFloat((Math.random() * 5 + 5).toFixed(1)), // random 5.0 - 10.0
          });
       }
    }

    await NotaModel.insertMany(notasList);

    console.log('✅ Seed Script Finished Successfully!');
    console.log('👉 Use email: admin@academiaflow.com | pasword: password123');
    process.exit(0);
  } catch (error) {
    console.error('❌ SEED FAILED:', error);
    process.exit(1);
  }
}

seed();
