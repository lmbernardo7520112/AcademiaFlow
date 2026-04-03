import { MongoMemoryServer } from 'mongodb-memory-server';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  console.log('--- OPERAÇÃO FORENSE: AUDITORIA DE INFRA E CÓDIGO ---');
  
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log(`[INFRA] MongoMemoryServer ativo em: ${uri}`);
  
  process.env.DATABASE_URL = uri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-16-characters-long';
  process.env.REFRESH_TOKEN_SECRET = 'test-secret-that-is-at-least-16-characters-long';

  try {
    console.log('[EXEC] Rodando sonda forense via tsx...');
    const output = execSync(`npx tsx ${path.join(__dirname, 'forensic-probe.ts')}`, {
      env: process.env,
      stdio: 'inherit'
    });
    console.log('--- AUDITORIA FINALIZADA COM SUCESSO ---');
  } catch (err) {
    console.error('\n--- AUDITORIA FALHOU: DIAGNÓSTICO ENCONTRADO ---');
  } finally {
    await mongod.stop();
  }
}

run();
