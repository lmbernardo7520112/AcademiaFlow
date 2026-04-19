import 'dotenv/config';
import { buildApp } from '../app.js';
import { UserModel } from '../models/User.js';

async function runSmokeTest() {
  console.log('🚀 Iniciando Smoke Test: Hardening Auth Guard\n');
  const app = await buildApp();
  await app.ready();

  // Cleanup
  await UserModel.deleteMany({ email: /smoke/ });

  console.log('--- TEST 1: APP_MODE=school_production ---');
  // Inject environment override (simulating school_production)
  process.env.APP_MODE = 'school_production';
  
  const res1 = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: 'Smoke Prod',
      email: 'smoke-prod@test.com',
      password: 'password123'
    }
  });

  console.log(`Status: ${res1.statusCode}`);
  const body1 = res1.json();
  console.log(`Message: ${body1.message}`);
  if (res1.statusCode === 403 && body1.message.includes('desabilitado')) {
    console.log('✅ Bloqueio de registro em produção OK\n');
  } else {
    console.error('❌ FALHA: Registro deveria estar bloqueado\n');
  }

  console.log('--- TEST 2: APP_MODE=demo ---');
  process.env.APP_MODE = 'demo';
  
  const res2 = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      name: 'Smoke Demo',
      email: 'smoke-demo@test.com',
      password: 'password123'
    }
  });

  console.log(`Status: ${res2.statusCode}`);
  if (res2.statusCode === 201) {
    console.log('✅ Registro em modo demo OK\n');
  } else {
    console.error(`❌ FALHA: Registro deveria ser permitido (Status: ${res2.statusCode})\n`);
  }

  console.log('--- TEST 3: Role Migration administrador -> admin ---');
  process.env.APP_MODE = 'school_production';
  
  // Create a user with legacy role directly in DB
  const argon2 = await import('argon2');
  const hashedPassword = await argon2.hash('password123');
  await UserModel.create({
    name: 'Legacy Admin',
    email: 'legacy@test.com',
    password: hashedPassword,
    role: 'administrador',
    tenantId: 'smoke-tenant'
  });

  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: 'legacy@test.com',
      password: 'password123'
    }
  });

  const loginBody = loginRes.json();
  console.log(`Role após login: ${loginBody.data.user.role}`);
  if (loginBody.data.user.role === 'admin') {
    console.log('✅ Migração de administrador -> admin OK\n');
  } else {
    console.error('❌ FALHA: Migração não ocorreu\n');
  }

  await app.close();
  console.log('🏁 Smoke Test Finalizado');
  process.exit(0);
}

runSmokeTest().catch(err => {
  console.error(err);
  process.exit(1);
});
