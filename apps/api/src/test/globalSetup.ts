import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

export default async function () {
  mongoServer = await MongoMemoryServer.create();
  process.env.DATABASE_URL = mongoServer.getUri();
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-16-characters-long';
  process.env.REFRESH_TOKEN_SECRET = 'test-secret-that-is-at-least-16-characters-long';
  process.env.NODE_ENV = 'test';
  // Unlock all bimesters for integration tests (full product capability)
  // Guard tests override this per-test to verify pilot policy
  process.env.SIAGE_PILOT_BIMESTERS = '';
  
  // Expose the instance so we can stop it in teardown
  (globalThis as typeof globalThis & { __MONGOINSTANCE?: MongoMemoryServer }).__MONGOINSTANCE = mongoServer;
}

export async function teardown() {
  const instance = (globalThis as typeof globalThis & { __MONGOINSTANCE?: MongoMemoryServer }).__MONGOINSTANCE;
  if (instance) {
    await instance.stop();
  }
}
