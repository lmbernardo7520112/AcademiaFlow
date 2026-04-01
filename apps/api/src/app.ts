import Fastify from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import dbPlugin from './plugins/db.js';
import jwtPlugin from './plugins/jwt.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { turmasRoutes } from './modules/turmas/turmas.routes.js';
import { alunosRoutes } from './modules/alunos/alunos.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  }).withTypeProvider<ZodTypeProvider>();

  // Add schema validators and serializers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // CORS
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://academiaflow.vercel.app']
      : ['http://localhost:5173'],
    credentials: true,
  });

  // DB and Plugins
  await app.register(dbPlugin);
  await app.register(jwtPlugin);

  // Routes registration
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(turmasRoutes, { prefix: '/api/turmas' });
  await app.register(alunosRoutes, { prefix: '/api/alunos' });

  // Basic health checks
  app.get('/api/ping', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  app.get('/', async () => {
    return { message: 'AcademiaFlow API v1.0.0' };
  });

  return app;
}
