import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { AlunoModel } from '../models/Aluno.js';
import { TurmaModel } from '../models/Turma.js';

dotenv.config();

async function count() {
  try {
    const uri = process.env.DATABASE_URL || 'mongodb://localhost:27017/academiaflow';
    await mongoose.connect(uri);
    
    const alunos = await AlunoModel.countDocuments({ isActive: true });
    const turmas = await TurmaModel.countDocuments({ isActive: true });
    
    console.log(`ALUNOS_COUNT=${alunos}`);
    console.log(`TURMAS_COUNT=${turmas}`);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

count();
