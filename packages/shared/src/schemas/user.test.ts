import { describe, it, expect } from 'vitest';
import { userSchema, createUserSchema, loginSchema } from './user.js';
import { ROLES } from './roles.js';

describe('userSchema', () => {
  it('should validate a valid user object', () => {
    const validUser = {
      id: '507f1f77bcf86cd799439011',
      tenantId: '507f1f77bcf86cd799439012',
      name: 'Leonardo Bernardo',
      email: 'leonardo@example.com',
      role: ROLES.ADMIN,
      isActive: true,
      createdAt: new Date(),
    };

    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should reject a user with invalid role', () => {
    const invalidRoleUser = {
      id: '507f1f77bcf86cd799439011',
      name: 'Leonardo Bernardo',
      email: 'leonardo@example.com',
      role: 'INVALID_ROLE',
    };

    expect(userSchema.safeParse(invalidRoleUser).success).toBe(false);
  });
});

describe('createUserSchema', () => {
  it('should validate valid creation payload', () => {
    const payload = {
      name: 'Professor Silva',
      email: 'silva@escola.com',
      password: 'strongpassword123',
    };

    const result = createUserSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe(ROLES.PROFESSOR); // Defaults to professor
    }
  });

  it('should reject short passwords', () => {
    const payload = {
      name: 'Professor Silva',
      email: 'silva@escola.com',
      password: '123',
    };
    expect(createUserSchema.safeParse(payload).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('should validate valid login payload', () => {
    expect(
      loginSchema.safeParse({ email: 'test@test.com', password: 'password123' }).success
    ).toBe(true);
  });
});
