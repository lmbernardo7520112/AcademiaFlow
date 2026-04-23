# AcademiaFlow - SIAGE Integration Context Bundle

**Contexto da Tarefa para a IA Receptora:**
'O sistema AcademiaFlow precisa de uma nova funcionalidade de interoperabilidade. O objetivo é desenvolver um Worker (utilizando Playwright) que acesse o sistema institucional SIAGE, realize o login, extraia as notas bimestrais dos alunos e as popule no banco de dados do AcademiaFlow. A arquitetura deve ser baseada em um Worker independente no monorepo pnpm, utilizando BullMQ para processamento em segundo plano e Zod para validação de contrato de dados entre os sistemas.'

---

## 1. Estrutura de Governança e Workspaces

### `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `package.json` (Root)
```json
{
  "name": "academiaflow",
  "version": "1.0.0",
  "private": true,
  "description": "Sistema de Gestão Acadêmica com IA — Monorepo Turborepo",
  "author": "Leonardo Maximino Bernardo",
  "license": "MIT",
  "packageManager": "pnpm@10.33.0",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "test:ci": "turbo test -- --reporter=verbose",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "validate-seed": "pnpm --filter @academiaflow/api validate-seed",
    "count-parity": "pnpm --filter @academiaflow/api count-parity",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "dependency-cruiser": "^17.3.10",
    "prettier": "^3.5.0",
    "turbo": "^2.5.0"
  },
  "pnpm": {
    "onlyBuiltDependencies": [
      "esbuild",
      "argon2",
      "mongodb-memory-server"
    ]
  }
}
```

### `apps/api/package.json`
```json
{
  "name": "@academiaflow/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src/ --max-warnings 0",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist",
    "seed:ci": "tsx src/scripts/reset-db.ts --mode ci",
    "seed:demo": "tsx src/scripts/reset-db.ts --mode demo",
    "seed": "pnpm run seed:ci",
    "validate-seed:ci": "tsx src/scripts/validate-seed.ts --mode ci",
    "validate-seed:demo": "tsx src/scripts/validate-seed.ts --mode demo",
    "validate-seed": "pnpm run validate-seed:ci"
  },
  "dependencies": {
    "@academiaflow/shared": "workspace:*",
    "@fastify/cors": "^11.0.0",
    "@fastify/helmet": "^13.0.2",
    "@fastify/jwt": "^9.0.0",
    "@fastify/multipart": "10.0.0",
    "@fastify/rate-limit": "^10.3.0",
    "@google/genai": "1.48.0",
    "argon2": "^0.44.0",
    "bcryptjs": "^3.0.2",
    "dotenv": "^16.5.0",
    "exceljs": "^4.4.0",
    "fastify": "^5.3.0",
    "fastify-plugin": "^5.1.0",
    "fastify-type-provider-zod": "^4.0.2",
    "mongoose": "^8.13.0",
    "pino": "^9.6.0",
    "pino-pretty": "^13.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.22.0",
    "@types/bcryptjs": "^3.0.0",
    "@types/node": "^22.15.0",
    "@vitest/coverage-v8": "3.2.4",
    "eslint": "^9.20.0",
    "mongodb-memory-server": "^11.0.1",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "typescript-eslint": "^8.28.0",
    "vitest": "^3.1.0"
  }
}
```

### `packages/shared/package.json`
```json
{
  "name": "@academiaflow/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src/ --max-warnings 0",
    "test": "vitest run",
    "test:watch": "vitest",
    "stryker": "stryker run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.22.0",
    "@stryker-mutator/core": "^9.6.1",
    "@stryker-mutator/vitest-runner": "^9.6.1",
    "@types/node": "^22.15.0",
    "@vitest/coverage-v8": "3.2.4",
    "eslint": "^9.20.0",
    "typescript": "^5.8.0",
    "typescript-eslint": "^8.28.0",
    "vitest": "^3.1.0"
  }
}
```

### `.env.example`
```env
# ============================================================
# AcademiaFlow — Environment Variables
# Copy to apps/api/.env and fill in the values
# ============================================================

# Server
PORT=3000
NODE_ENV=development

# Application Mode: 
# 'demo' (Default) - Enables all features, including self-service registration and "Teste como Diretor" flow.
# 'school_production' - Hardened mode for physical schools. Disables public registration and redirects onboarding to login.
APP_MODE=demo

# Database
DATABASE_URL=mongodb://localhost:27017/academiaflow_db

# JWT Authentication
JWT_SECRET=your-jwt-secret-here-change-in-production
REFRESH_TOKEN_SECRET=your-refresh-secret-here-change-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# AI: Google Gemini (Primary)
GEMINI_API_KEY=your-gemini-api-key-here

# AI: n8n Webhooks (Optional)
# N8N_AI_WEBHOOK_URL=https://your-n8n.com/webhook/ai-generate
# N8N_FEEDBACK_WEBHOOK_URL=https://your-n8n.com/webhook/ai-feedback

# AI: Provider Priority (comma-separated: gemini, n8n, openai)
AI_PROVIDER_PRIORITY=gemini

# AI: OpenAI (Optional fallback)
# OPENAI_API_KEY=your-openai-api-key-here

# Frontend
VITE_API_URL=http://localhost:3000/api
```

---

## 2. Camada de Dados e Contratos Zod

### `apps/api/src/models/Aluno.ts`
```typescript
import mongoose, { Schema } from 'mongoose';

const alunoSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    matricula: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    turmaId: {
      type: Schema.Types.ObjectId,
      ref: 'Turma',
      required: true,
    },
    dataNascimento: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    transferido: {
      type: Boolean,
      default: false,
    },
    abandono: {
      type: Boolean,
      default: false,
    },
    normalizedName: {
      type: String,
      index: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Normalização de status: se transferido ou abandono, isActive = false
alunoSchema.pre('save', function (next) {
  if (this.transferido || this.abandono) {
    this.isActive = false;
  }
  // Compute normalizedName for deterministic matching (Busca Ativa)
  if (this.isModified('name') || !this.normalizedName) {
    this.normalizedName = (this.name as string)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }
  next();
});

alunoSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as Record<string, unknown>;
  if (update.transferido === true || update.abandono === true) {
    this.set({ isActive: false });
  }
  next();
});

export const AlunoModel = mongoose.model('Aluno', alunoSchema);
```

### `apps/api/src/models/Turma.ts`
```typescript
import mongoose, { Schema } from 'mongoose';
import { TURMA_PERIODOS } from '@academiaflow/shared';

const turmaSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
    },
    periodo: {
      type: String,
      enum: TURMA_PERIODOS,
      default: 'matutino',
    },
    professorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const TurmaModel = mongoose.model('Turma', turmaSchema);
```

### `apps/api/src/models/Disciplina.ts`
```typescript
import mongoose, { Schema } from 'mongoose';

const disciplinaSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    codigo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z]{2,4}-\d{3}$/,
    },
    professorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    turmaIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Turma',
      default: [],
    }],
    cargaHoraria: {
      type: Number,
      min: 10,
      max: 400,
      default: 60,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const DisciplinaModel = mongoose.model('Disciplina', disciplinaSchema);
```

### `apps/api/src/models/Nota.ts`
```typescript
import mongoose, { Schema } from 'mongoose';

const notaSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    alunoId: {
      type: Schema.Types.ObjectId,
      ref: 'Aluno',
      required: true,
    },
    disciplinaId: {
      type: Schema.Types.ObjectId,
      ref: 'Disciplina',
      required: true,
    },
    turmaId: {
      type: Schema.Types.ObjectId,
      ref: 'Turma',
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    bimester: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    value: {
      type: Number,
      required: false,
      min: 0,
      max: 10,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookups per report card
notaSchema.index({ alunoId: 1, disciplinaId: 1, year: 1, bimester: 1 }, { unique: true });

// Otimização para Agregações por Turma e Analytics de Desempenho
notaSchema.index({ tenantId: 1, turmaId: 1, value: 1 });

export const NotaModel = mongoose.model('Nota', notaSchema);
```

### `packages/shared/src/schemas/nota.ts`
```typescript
import { z } from 'zod';
import {
  objectIdSchema,
  academicYearSchema,
  bimesterSchema,
  gradeValueSchema,
  timestampFieldsSchema,
  tenantIdSchema,
} from './primitives.js';

export const notaSchema = z.object({
  id: objectIdSchema,
  tenantId: tenantIdSchema,
  alunoId: objectIdSchema,
  disciplinaId: objectIdSchema,
  turmaId: objectIdSchema,
  year: academicYearSchema,
  bimester: bimesterSchema,
  value: gradeValueSchema,
  ...timestampFieldsSchema.shape,
});

export type Nota = z.infer<typeof notaSchema>;

export const createNotaSchema = notaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
});

export type CreateNotaPayload = z.infer<typeof createNotaSchema>;

export const createBulkNotasSchema = z.array(createNotaSchema).min(1);

export type CreateBulkNotasPayload = z.infer<typeof createBulkNotasSchema>;

export const updateNotaSchema = createNotaSchema.partial();

export type UpdateNotaPayload = z.infer<typeof updateNotaSchema>;

/** Schema para o Boletim Individual do Aluno */
export const boletimIndividualSchema = z.object({
  aluno: z.object({
    id: z.string(),
    name: z.string(),
    matricula: z.string(),
    turmaName: z.string().optional(),
  }),
  year: z.number(),
  disciplinas: z.array(z.object({
    id: z.string(),
    name: z.string(),
    notas: z.object({
      bimestre1: z.number().nullable(),
      bimestre2: z.number().nullable(),
      bimestre3: z.number().nullable(),
      bimestre4: z.number().nullable(),
      pf: z.number().nullable(),
    }),
    nf: z.number().nullable(),
    mg: z.number().nullable(),
    mf: z.number().nullable(),
    situacao: z.string(),
  })),
});

export type BoletimIndividualResponse = z.infer<typeof boletimIndividualSchema>;
```

### `packages/shared/src/schemas/grade-calculations.ts`
```typescript
import { z } from 'zod';

export const SITUACAO_VALUES = ['Aprovado', 'Reprovado', 'Recuperação', 'Pendente'] as const;

export const situacaoSchema = z.enum(SITUACAO_VALUES);
export type SituacaoAluno = z.infer<typeof situacaoSchema>;

const APROVACAO_THRESHOLD = 6.0;
const RECUPERACAO_THRESHOLD = 4.0;

export function calculateNF(notas: (number | null | undefined)[]): number | null {
  const validNotas = notas.filter((n): n is number => n != null && !isNaN(n));
  if (validNotas.length === 0) return null;
  const sum = validNotas.reduce((acc, val) => acc + val, 0);
  return parseFloat((sum / validNotas.length).toFixed(2));
}

export function calculateMG(nf: number | null): number | null {
  return nf;
}

export function calculateMF(mg: number | null, pf: number | null | undefined): number | null {
  if (mg == null) return null;
  if (pf == null) return mg;
  return parseFloat(((mg + pf) / 2).toFixed(2));
}

export function determineSituacao(
  mg: number | null,
  pf?: number | null
): SituacaoAluno {
  if (mg == null) return 'Pendente';
  if (mg >= APROVACAO_THRESHOLD) return 'Aprovado';
  if (pf != null) {
    const mf = calculateMF(mg, pf);
    if (mf != null && mf >= APROVACAO_THRESHOLD) return 'Aprovado';
    return 'Reprovado';
  }
  if (mg >= RECUPERACAO_THRESHOLD) return 'Recuperação';
  return 'Reprovado';
}

export const boletimConsolidadoSchema = z.object({
  alunoId: z.string(),
  alunoName: z.string(),
  matricula: z.string(),
  disciplinaId: z.string(),
  disciplinaName: z.string(),
  turmaId: z.string(),
  year: z.number(),
  notas: z.object({
    bimestre1: z.number().nullable(),
    bimestre2: z.number().nullable(),
    bimestre3: z.number().nullable(),
    bimestre4: z.number().nullable(),
    pf: z.number().nullable().optional(),
  }),
  nf: z.number().nullable().describe('Nota Final (média simples dos bimestres)'),
  mg: z.number().nullable().describe('Média Global'),
  mf: z.number().nullable().describe('Média Final (com PF se aplicável)'),
  situacao: situacaoSchema,
});

export type BoletimConsolidado = z.infer<typeof boletimConsolidadoSchema>;
```

---

## 3. Backend (Fastify)

### `apps/api/src/server.ts`
```typescript
import 'dotenv/config';
import { buildApp } from './app.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚀 AcademiaFlow API running at http://localhost:${PORT}`);

    // Garante que a porta 3000 seja liberada assim que o tsx reiniciar o processo
    ['SIGINT', 'SIGTERM'].forEach((signal) => {
      process.on(signal, async () => {
        await app.close();
        process.exit(0);
      });
    });

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
```

### `apps/api/src/app.ts`
```typescript
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

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (process.env.NODE_ENV !== 'production') {
        if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
      }
      if (process.env.APP_MODE === 'school_production' || process.env.VITE_APP_MODE === 'school_production') {
        if (/\.loca\.lt$/.test(origin)) return cb(null, true);
      }
      return cb(null, true);
    },
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
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

  app.get('/api/ping', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  app.get('/', async () => {
    return { message: 'AcademiaFlow API v1.2.0' };
  });

  return app;
}
```

---

## 4. Padrões de Teste (Vitest)

### `packages/shared/src/schemas/nota.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { createNotaSchema, createBulkNotasSchema } from './nota.js';

describe('createNotaSchema', () => {
  it('should validate a correct grade payload', () => {
    const payload = {
      alunoId: '507f1f77bcf86cd799439011',
      disciplinaId: '507f1f77bcf86cd799439022',
      turmaId: '507f1f77bcf86cd799439033',
      year: 2025,
      bimester: 1,
      value: 8.5,
    };
    expect(createNotaSchema.safeParse(payload).success).toBe(true);
  });

  it('should reject invalid grade value', () => {
    const invalidPayload = {
      alunoId: '507f1f77bcf86cd799439011',
      disciplinaId: '507f1f77bcf86cd799439022',
      turmaId: '507f1f77bcf86cd799439033',
      year: 2025,
      bimester: 1,
      value: 11, // max is 10
    };
    expect(createNotaSchema.safeParse(invalidPayload).success).toBe(false);
  });
});

describe('createBulkNotasSchema', () => {
  it('should accept an array of valid grades', () => {
    const items = [
      {
        alunoId: '507f1f77bcf86cd799439011',
        disciplinaId: '507f1f77bcf86cd799439022',
        turmaId: '507f1f77bcf86cd799439033',
        year: 2025,
        bimester: 1,
        value: 8.5,
      },
      {
        alunoId: '507f1f77bcf86cd799439012',
        disciplinaId: '507f1f77bcf86cd799439022',
        turmaId: '507f1f77bcf86cd799439033',
        year: 2025,
        bimester: 1,
        value: 7.0,
      },
    ];
    expect(createBulkNotasSchema.safeParse(items).success).toBe(true);
  });

  it('should reject an empty array', () => {
    expect(createBulkNotasSchema.safeParse([]).success).toBe(false);
  });
});
```
