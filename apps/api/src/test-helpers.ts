import type { FastifyInstance } from 'fastify';
import { UserModel } from './models/User.js';
import argon2 from 'argon2';
import mongoose from 'mongoose';

/**
 * Shared test helper for creating authenticated test users.
 * Since /register is now protected (JWT + admin role), tests MUST create users
 * directly via the model and sign JWTs manually.
 */

export interface TestUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  tenantId: string;
  role: string;
  token: string;
}

export async function createTestUser(
  app: FastifyInstance,
  overrides: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    tenantId?: string;
  } = {}
): Promise<TestUser> {
  const timestamp = Date.now();
  const tenantId = overrides.tenantId || new mongoose.Types.ObjectId().toString();
  const password = overrides.password || 'testpassword123';

  const user = await UserModel.create({
    name: overrides.name || `Test User ${timestamp}`,
    email: overrides.email || `test.${timestamp}@academiaflow.com`,
    password: await argon2.hash(password),
    role: overrides.role || 'admin',
    tenantId,
  });

  const token = await app.jwt.sign({
    id: String(user._id),
    role: user.role,
    tenantId: String(user.tenantId),
  });

  return {
    _id: user._id as mongoose.Types.ObjectId,
    email: user.email,
    tenantId: String(user.tenantId),
    role: user.role,
    token,
  };
}
