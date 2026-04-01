import Fastify from 'fastify';
import cors from '@fastify/cors';

/**
 * Creates and configures the Fastify application instance.
 * Separated from server.ts for testability (SDD principle).
 */
export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // CORS
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://academiaflow.vercel.app']
      : ['http://localhost:5173'],
    credentials: true,
  });

  // Health check route
  app.get('/api/ping', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Root route
  app.get('/', async () => {
    return { message: 'AcademiaFlow API v1.0.0' };
  });

  return app;
}
