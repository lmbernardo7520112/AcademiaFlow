# AcademiaFlow — Baseline 0 (Instrumentação Real)

> **Propósito**: Registrar o estado real do repositório para calibrar thresholds futuros.
> Nenhuma alteração de código de produção foi feita. Nenhum threshold foi definido.

---

## 1. Metadados da Medição

| Campo | Valor |
|-------|-------|
| Data/hora | 2026-04-22T23:39 UTC-3 |
| Branch | `main` |
| Commit | `869196a` (tag `v1.3.0`) |
| Working tree | **Limpo** (`git status --short` vazio) |
| Remote sync | 0 ahead, 0 behind `origin/main` |
| Ferramenta de coverage | `vitest 3.2.4` + `@vitest/coverage-v8@3.2.4` (oficializado — ver ADR-001) |
| Ferramenta de complexidade | `eslint` com regra `complexity: ["warn", 10]` |
| Ferramenta de ciclos | `madge 8.0.0` |
| Ferramenta de audit | `pnpm audit` |

---

## 2. Coverage Real por Pacote

### 2.1 `apps/api` — 104 testes, todos passando

| Escopo | % Stmts | % Branch | % Funcs | % Lines |
|--------|---------|----------|---------|---------|
| **All files** | **65.30** | **69.69** | **71.84** | **65.30** |
| src/config | 86.36 | 0.00 | 100.00 | 86.36 |
| src/models | 91.83 | 33.33 | 0.00 | 91.83 |
| src/modules/ai | 56.89 | 57.14 | 63.15 | 56.89 |
| src/modules/alunos | 46.07 | 46.15 | 42.85 | 46.07 |
| src/modules/auth | 74.59 | 64.28 | 87.50 | 74.59 |
| src/modules/busca-ativa | 85.09 | 70.96 | 93.33 | 85.09 |
| src/modules/disciplinas | 44.02 | 66.66 | 50.00 | 44.02 |
| src/modules/notas | 85.56 | 70.14 | 100.00 | 85.56 |
| src/modules/professor | 65.15 | 87.50 | 66.66 | 65.15 |
| src/modules/reports | 57.26 | 80.55 | 57.14 | 57.26 |
| src/modules/turmas | 86.17 | 66.66 | 100.00 | 86.17 |
| src/plugins | 60.14 | 80.00 | 100.00 | 60.14 |
| src/scripts | 0.00 | 0.00 | 0.00 | 0.00 |

**Nota**: `src/scripts` (reset-db, validate-seed, etc.) tem 0% porque são scripts CLI, não testados via vitest.
`ownership.ts` tem 34.28% — ownership middleware sub-testado (linhas 47-102).

### 2.2 `apps/web` — 54 testes, todos passando

| Escopo | % Stmts | % Branch | % Funcs | % Lines |
|--------|---------|----------|---------|---------|
| **All files** | **39.50** | **73.27** | **34.48** | **39.50** |
| src/components | 14.89 | 75.00 | 42.85 | 14.89 |
| src/components/ui | 77.50 | 85.00 | 80.00 | 77.50 |
| src/config | 100.00 | 0.00 | 100.00 | 100.00 |
| src/contexts | 60.46 | 60.00 | 16.66 | 60.46 |
| src/pages/auth | 0.99 | 100.00 | 0.00 | 0.99 |
| src/services | 32.14 | 0.00 | 0.00 | 32.14 |

**Nota**: Muitas páginas dashboard (NotasPage, TurmasPage, AlunosPage, BuscaAtivaPage, SecretariaPortal, TurmaAnalyticsPage) e componentes (TurmaCard, TurmaGrid, BoletimDocument, DataTable, ErrorBoundary) não aparecem na tabela agrupada — cobertura implícita 0%.

### 2.3 `packages/shared` — 208 testes, todos passando

| Escopo | % Stmts | % Branch | % Funcs | % Lines |
|--------|---------|----------|---------|---------|
| **All files** | **86.22** | **89.92** | **88.88** | **86.22** |

---

## 3. Complexidade Real

**Ferramenta**: ESLint built-in `complexity` rule, threshold report: CC > 10.
**Escopo**: `apps/api/src/`

### Funções com CC > 10 (ordenadas por complexidade)

| CC | Função | Arquivo | LOC |
|----|--------|---------|-----|
| **26** | `extractJsonFromString` | `modules/ai/utils/json-extractor.ts:3` | 101 |
| **20** | `runSeedDemo` | `scripts/reset-db.ts:103` | ~130 |
| **17** | `resetDB` | `scripts/reset-db.ts:239` | ~60 |
| **17** | `getBoletim` | `modules/notas/notas.service.ts:140` | ~75 |
| **14** | `uploadAttachment` | `modules/busca-ativa/busca-ativa.service.ts:542` | ~65 |
| **12** | anonymous arrow | `modules/busca-ativa/busca-ativa.routes.ts:24` | ~30 |
| **11** | `getDashboardTurma` | `modules/reports/reports.service.ts:93` | ~120 |
| **11** | `getProfessorAnalytics` | `modules/reports/reports.service.ts:213` | ~55 |
| **11** | `update` | `modules/notas/notas.service.ts:108` | ~25 |

**Total**: 9 funções acima de CC=10.
**Pior**: `extractJsonFromString` com CC=26 — parsing JSON com fallbacks múltiplos.
**CC máximo observado**: 26.

---

## 4. Ciclos de Dependência

**Ferramenta**: `madge 8.0.0` com `--circular --extensions ts,tsx`

| Escopo | Ciclos encontrados |
|--------|--------------------|
| `apps/api/src` (81 arquivos) | **0** ✅ |
| `apps/web/src` (75 arquivos) | **0** ✅ |

Os lazy imports em `ownership.ts` e `reports.service.ts` (usando `await import()`) **NÃO são ciclos reais** — são importações dinâmicas unidirecionais. `madge` confirma ausência de ciclos estruturais.

---

## 5. Arquivos Acima de 400 LOC (excluindo testes)

| LOC | Arquivo | Tipo |
|-----|---------|------|
| **644** | `apps/api/src/modules/busca-ativa/busca-ativa.service.ts` | Service (god service) |
| **515** | `packages/shared/src/schemas/absence-parser.ts` | Schema + parser |

**Total**: 2 arquivos acima do budget de 400 LOC.

Arquivos entre 300-400 LOC (zona de atenção):
- `busca-ativa.ts` (shared): 352 LOC
- `busca-ativa.routes.ts`: 352 LOC
- `reports.service.ts`: 368 LOC
- `BuscaAtivaPage.tsx`: 382 LOC
- `reset-db.ts`: 303 LOC
- `GradeManagement.tsx`: 327 LOC

---

## 6. Dependências Não Pinadas

| Pacote | Versão declarada | Arquivo |
|--------|-----------------|---------|
| `@google/genai` | `"latest"` | `apps/api/package.json:28` |

**Total**: 1 dependência com `"latest"`.
Demais dependências usam ranges semver (`^x.y.z`), que é prática aceitável.

---

## 7. Audit de Vulnerabilidades

**Comando**: `pnpm audit`
**Resultado**: **13 vulnerabilidades encontradas**

| Severidade | Quantidade | Pacotes afetados |
|------------|-----------|------------------|
| **Critical** | 3 | `fast-jwt` (2 CVEs via `@fastify/jwt`), `protobufjs` (via `@google/genai`) |
| **High** | 2 | `fast-jwt` (1 CVE), `fastify` (body schema validation bypass) |
| **Moderate** | 8 | `esbuild`, `vite`, `fast-jwt` (2), `follow-redirects`, `axios` (2), `uuid` |

### Vulnerabilidades Críticas (detalhe)

1. **fast-jwt: Incomplete fix for CVE-2023-48223** — via `apps/api > @fastify/jwt > fast-jwt`
2. **fast-jwt: Cache Confusion via cacheKeyBuilder** — via `apps/api > @fastify/jwt > fast-jwt`
3. **protobufjs: Arbitrary code execution** — via `apps/api > @google/genai > protobufjs`

### Vulnerabilidades High

4. **fast-jwt: accepts unknown `crit` header extensions** — via `@fastify/jwt`
5. **fastify: Body Schema Validation Bypass** — via `apps/api > fastify`

---

## 8. Achados Prioritários da Baseline

1. **Coverage API é 65.3%** — significativamente acima do estimado (~45%); threshold pode ser calibrado com mais ambição
2. **Coverage Web é 39.5%** — também acima do estimado (~15%); gap real está em páginas dashboard e services (0%)
3. **Coverage Shared é 86.2%** — forte; faltam testes para `reports.ts` e `validacao-pedagogica.ts`
4. **CC máximo real é 26** (`json-extractor.ts`) — quase 2x do estimado; 9 funções > CC=10
5. **Zero ciclos de dependência** — confirmado por `madge`; lazy imports são precaução, não sintoma
6. **2 arquivos > 400 LOC** — `busca-ativa.service.ts` (644) e `absence-parser.ts` (515)
7. **1 dependência `"latest"`** — `@google/genai` em `apps/api`
8. **13 vulnerabilidades**, incluindo 3 críticas (fast-jwt, protobufjs) e 2 high (fast-jwt, fastify)
9. **`ownership.ts` com 34% coverage** — middleware de segurança sub-testado
10. **`src/scripts` com 0% coverage** — esperado (CLI scripts), mas `reset-db.ts` tem CC=20

---

## 9. Apêndice de Comandos

```bash
# 0.1 — Sanidade
git branch --show-current
git log --oneline -1
git status --short
git rev-list --left-right --count HEAD...origin/main

# 0.2 — Coverage (necessitou instalar @vitest/coverage-v8)
# Instalação de medição:
pnpm --filter @academiaflow/api add -D @vitest/coverage-v8@^3.2.0
pnpm --filter @academiaflow/web add -D @vitest/coverage-v8@^3.2.0
pnpm --filter @academiaflow/shared add -D @vitest/coverage-v8@^3.1.0
# Execução:
cd apps/api && npx vitest run --coverage
cd apps/web && npx vitest run --coverage
cd packages/shared && npx vitest run --coverage

# 0.3 — Complexidade
cd apps/api && npx eslint src/ --rule 'complexity: [warn, 10]' 2>&1 | grep "complexity"

# 0.4 — Ciclos
npx madge --circular --extensions ts apps/api/src
npx madge --circular --extensions ts,tsx apps/web/src

# 0.5 — Arquivos > 400 LOC
find apps/ packages/ -name '*.ts' -o -name '*.tsx' | grep -v node_modules | grep -v dist | grep -v '.test.' | xargs wc -l | awk '$1 > 400'

# 0.6 — Deps não pinadas
grep -n '"latest"' apps/*/package.json packages/*/package.json

# 0.7 — Audit
pnpm audit --audit-level=moderate
```

### Observações sobre a instrumentação

1. `@vitest/coverage-v8` **não existia** como dependência do projeto — foi instalado em cada workspace para medição. Isso gerou alterações em `package.json` e `pnpm-lock.yaml` (5 arquivos, 330 linhas).
2. `madge` foi instalado via `npx` (temporário, sem alteração ao projeto).
3. O ESLint complexity scan usou o config existente do projeto com regra adicional inline.
4. A versão root de `vitest` (4.1.5 via hoisting) é incompatível com `@vitest/coverage-v8@4.x` + `vite@5.x` — a versão compatível é `@vitest/coverage-v8@^3.x` para cada workspace.
