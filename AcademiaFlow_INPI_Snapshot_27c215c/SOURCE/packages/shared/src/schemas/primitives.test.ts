import { describe, it, expect } from 'vitest';
import {
  objectIdSchema,
  emailSchema,
  nonEmptyStringSchema,
  passwordSchema,
  gradeValueSchema,
  bimesterSchema,
  academicYearSchema,
  paginationSchema,
  apiResponseSchema,
} from './primitives.js';
import { z } from 'zod';

describe('objectIdSchema', () => {
  it('should accept valid MongoDB ObjectId', () => {
    const result = objectIdSchema.safeParse('507f1f77bcf86cd799439011');
    expect(result.success).toBe(true);
  });

  it('should reject invalid ObjectId', () => {
    expect(objectIdSchema.safeParse('invalid').success).toBe(false);
    expect(objectIdSchema.safeParse('').success).toBe(false);
    expect(objectIdSchema.safeParse('507f1f77bcf86cd79943901').success).toBe(false); // 23 chars
  });
});

describe('emailSchema', () => {
  it('should accept valid email and normalize', () => {
    const result = emailSchema.safeParse('  USER@Example.COM  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('user@example.com');
    }
  });

  it('should reject invalid email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

describe('nonEmptyStringSchema', () => {
  it('should accept non-empty string and trim', () => {
    const result = nonEmptyStringSchema.safeParse('  hello  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('hello');
    }
  });

  it('should reject empty string', () => {
    expect(nonEmptyStringSchema.safeParse('').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('should accept password with 6+ chars', () => {
    expect(passwordSchema.safeParse('abc123').success).toBe(true);
  });

  it('should reject password with less than 6 chars', () => {
    expect(passwordSchema.safeParse('abc').success).toBe(false);
  });

  it('should reject password with more than 128 chars', () => {
    expect(passwordSchema.safeParse('a'.repeat(129)).success).toBe(false);
  });
});

describe('gradeValueSchema', () => {
  it('should accept values 0 to 10', () => {
    expect(gradeValueSchema.safeParse(0).success).toBe(true);
    expect(gradeValueSchema.safeParse(5.5).success).toBe(true);
    expect(gradeValueSchema.safeParse(10).success).toBe(true);
  });

  it('should reject values outside 0-10', () => {
    expect(gradeValueSchema.safeParse(-1).success).toBe(false);
    expect(gradeValueSchema.safeParse(10.1).success).toBe(false);
  });
});

describe('bimesterSchema', () => {
  it('should accept 1, 2, 3, 4, 5', () => {
    for (const b of [1, 2, 3, 4, 5]) {
      expect(bimesterSchema.safeParse(b).success).toBe(true);
    }
  });

  it('should reject 0, 6, or decimals', () => {
    expect(bimesterSchema.safeParse(0).success).toBe(false);
    expect(bimesterSchema.safeParse(6).success).toBe(false);
    expect(bimesterSchema.safeParse(1.5).success).toBe(false);
  });
});

describe('academicYearSchema', () => {
  it('should accept valid academic years', () => {
    expect(academicYearSchema.safeParse(2025).success).toBe(true);
    expect(academicYearSchema.safeParse(2026).success).toBe(true);
  });

  it('should reject years outside range', () => {
    expect(academicYearSchema.safeParse(2019).success).toBe(false);
    expect(academicYearSchema.safeParse(2051).success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('should provide defaults when no values given', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should coerce string values', () => {
    const result = paginationSchema.safeParse({ page: '3', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should reject limit over 100', () => {
    expect(paginationSchema.safeParse({ page: 1, limit: 101 }).success).toBe(false);
  });
});

describe('apiResponseSchema', () => {
  it('should validate a typed API response', () => {
    const schema = apiResponseSchema(z.string());
    const result = schema.safeParse({ success: true, data: 'hello' });
    expect(result.success).toBe(true);
  });

  it('should reject mismatched data type', () => {
    const schema = apiResponseSchema(z.number());
    expect(schema.safeParse({ success: true, data: 'not a number' }).success).toBe(false);
  });
});
