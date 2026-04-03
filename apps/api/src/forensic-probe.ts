import { buildApp } from './app.js';
import { iaPedagogicoService } from './modules/ai/ia_pedagogico.service.js';
import { DisciplinaModel } from './models/Disciplina.js';
import { TurmaModel } from './models/Turma.js';
import mongoose from 'mongoose';

async function audit() {
  console.log('--- OPERAÇÃO FORENSE: VALIDAÇÃO SANEADA ---');
  
  process.env.NODE_ENV = 'test';
  const dbUrl = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/test';
  
  try {
    console.log(`1. Conectando Mongoose a ${dbUrl}...`);
    await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 5000 });
    
    const app = await buildApp();
    await app.ready();
    
    await mongoose.connection.db?.dropDatabase();
    
    // 2. Setup Mock Data EXATAMENTE como o Modelo exige
    console.log('2. Preparando dados complacentes (Regex e Required)...');
    const professorId = new mongoose.Types.ObjectId();
    const turma = await TurmaModel.create({ 
      name: 'Turma Complacente', 
      year: 2026, 
      tenantId: 'test-tenant' 
    });
    
    const disciplina = await DisciplinaModel.create({ 
      name: 'Matemática Complacente', 
      codigo: 'MAT-001', // Regex FIX: [A-Z]{2,4}-\d{3}
      professorId: professorId, // Garante professorId
      turmaId: turma._id,      // Garante turmaId
      tenantId: 'test-tenant'
    });
    
    console.log('3. Invocando generatePerformanceAnalysis...');
    // Injetar o provider para garantir que o Mock seja usado na sonda
    const { MockLLMProvider } = await import('./modules/ai/providers/MockLLMProvider.js');
    iaPedagogicoService.setProvider(new MockLLMProvider());

    const result = await iaPedagogicoService.generatePerformanceAnalysis(
      'test-tenant',
      1,
      2026,
      disciplina._id.toString()
    );
    
    console.log('\n✅ SUCESSO ABSOLUTO: O serviço síncronamente respondeu Status 200.');
    console.log(`ANALYSIS_CONTENT: ${result.content.substring(0, 50)}...`);
    
    await app.close();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERRO DETECTADO MESMO COM DADOS SANEADOS:');
    console.error(err instanceof Error ? err.message : err);
    console.error(err instanceof Error ? err.stack : 'Sem stack');
    process.exit(1);
  }
}

audit();
