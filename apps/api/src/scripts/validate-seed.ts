import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import { AlunoModel } from '../models/Aluno.js';
import { TurmaModel } from '../models/Turma.js';

dotenv.config();

const LEGACY_FILE = '/home/leonardomaximinobernardo/My_projects/workspace/reference/academiaflow_legacy/server/turmas_alunos.json';

async function validate() {
  console.log('🔍 Iniciando Auditoria de Paridade de Dados (Seed Validation)...');
  
  try {
    const uri = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/academiaflow';
    await mongoose.connect(uri);
    
    if (!fs.existsSync(LEGACY_FILE)) {
      throw new Error(`Arquivo legado não encontrado em: ${LEGACY_FILE}`);
    }

    const legacyRaw = JSON.parse(fs.readFileSync(LEGACY_FILE, 'utf-8'));
    const legacyTurmas = legacyRaw.turmas || [];
    
    // 1. Validar Turmas
    const dbTurmas = await TurmaModel.countDocuments({ isActive: true });
    const legacyTurmasCount = legacyTurmas.length;
    
    console.log(`\n--- TURMAS ---`);
    console.log(`Legado: ${legacyTurmasCount}`);
    console.log(`Banco:  ${dbTurmas}`);
    
    if (dbTurmas !== legacyTurmasCount) {
      console.warn('⚠️ Disparidade detectada na contagem de turmas!');
    }

    // 2. Validar Alunos
    const dbAlunos = await AlunoModel.countDocuments({ isActive: true });
    const legacyAlunosCount = legacyTurmas.reduce((acc: number, curr: any) => acc + (curr.alunos?.length || 0), 0);
    
    console.log(`\n--- ALUNOS ---`);
    console.log(`Legado: ${legacyAlunosCount}`);
    console.log(`Banco:  ${dbAlunos}`);
    
    if (dbAlunos !== legacyAlunosCount) {
      console.warn('⚠️ Disparidade detectada na contagem de alunos!');
    } else {
      console.log('✅ Integridade de volume confirmada (Paridade 100%).');
    }

    // 3. Amostragem Aleatória de Vínculos
    console.log(`\n--- AMOSTRAGEM DE VÍNCULOS ---`);
    const randomTurmaObj = legacyTurmas[Math.floor(Math.random() * legacyTurmasCount)];
    
    if (randomTurmaObj) {
      const randomTurmaName = randomTurmaObj.nome_turma;
      const randomTurma = await TurmaModel.findOne({ name: randomTurmaName });
      if (randomTurma) {
        const alumnosInTurma = await AlunoModel.countDocuments({ turmaId: randomTurma._id });
        const legacyCountForTurma = (randomTurmaObj.alunos || []).length;
        console.log(`Turma: ${randomTurmaName}`);
        console.log(`Legado: ${legacyCountForTurma}`);
        console.log(`Banco:  ${alumnosInTurma}`);
        
        if (alumnosInTurma === legacyCountForTurma) {
          console.log('✅ Amostra validada!');
        } else {
          console.warn('❌ Erro de alocação na amostra.');
        }
      }
    }

  } catch (err: any) {
    console.error('❌ Erro na validação:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

validate();
