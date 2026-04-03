import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

// Garantir ambiente de teste em todos os workers
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';

beforeAll(async () => {
  // Use the global DATABASE_URL
  if (process.env.DATABASE_URL) {
    await mongoose.connect(process.env.DATABASE_URL);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      if (collection) {
        await collection.deleteMany({});
      }
    }
  }
});
