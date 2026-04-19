import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import dbPlugin from './plugins/db.js';
import jwtPlugin from './plugins/jwt.js';
import ownershipPlugin from './plugins/ownership.js';
import multipartPlugin from './plugins/multipart.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { turmasRoutes } from './modules/turmas/turmas.routes.js';
import { alunosRoutes } from './modules/alunos/alunos.routes.js';
import { disciplinasRoutes } from './modules/disciplinas/disciplinas.routes.js';
import { notasRoutes } from './modules/notas/notas.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { professorRoutes } from './modules/professor/professor.routes.js';
import { buscaAtivaRoutes } from './modules/busca-ativa/busca-ativa.routes.js';

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

  // ── Security: Helmet ──────────────────────────────────────────
  // Adds security headers (X-Content-Type-Options, X-Frame-Options, etc.)
  // CSP disabled because SPA serves from same origin
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Global rate limit: high ceiling. Route-specific limits in auth.routes.ts
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // CORS — Appliance-safe configuration
  // In appliance mode, requests come through Nginx reverse proxy (same origin),
  // so we accept the origin dynamically. In dev, we allow localhost.
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (same-origin, curl, server-to-server)
      if (!origin) return cb(null, true);
      // In development, allow any localhost
      if (process.env.NODE_ENV !== 'production') {
        if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
      }
      // In appliance mode, allow the tunnel domain
      if (process.env.APP_MODE === 'school_production' || process.env.VITE_APP_MODE === 'school_production') {
        if (/\.loca\.lt$/.test(origin)) return cb(null, true);
      }
      // In production, allow any origin (appliance is behind Nginx on same network)
      // For cloud deployments, restrict this to specific domains
      return cb(null, true);
    },
    credentials: true,
  });

  // DB and Plugins
  await app.register(dbPlugin);
  await app.register(jwtPlugin);
  await app.register(ownershipPlugin);
  await app.register(multipartPlugin);

  // Routes registration
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(turmasRoutes, { prefix: '/api/turmas' });
  await app.register(alunosRoutes, { prefix: '/api/alunos' });
  await app.register(disciplinasRoutes, { prefix: '/api/disciplinas' });
  await app.register(notasRoutes, { prefix: '/api/notas' });
  await app.register(reportsRoutes, { prefix: '/api/reports' });
  await app.register(aiRoutes, { prefix: '/api/ai' });
  await app.register(professorRoutes, { prefix: '/api/professor' });
  await app.register(buscaAtivaRoutes, { prefix: '/api/busca-ativa' });

  // Basic health checks
  app.get('/api/ping', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  app.get('/', async () => {
    return { message: 'AcademiaFlow API v1.2.0' };
  });

  return app;
}
