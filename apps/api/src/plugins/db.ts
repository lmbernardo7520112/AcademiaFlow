import fp from 'fastify-plugin';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

export default fp(async (fastify) => {
  try {
    mongoose.connection.on('connected', () => {
      fastify.log.info({ url: env.DATABASE_URL }, 'MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      fastify.log.error({ err }, 'MongoDB connection error');
    });

    // Don't connect if it's already connected (useful for testing envs)
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.DATABASE_URL);
    }
    
    // Graceful shutdown
    fastify.addHook('onClose', async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        fastify.log.info('MongoDB disconnected on server close');
      }
    });

  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
});
