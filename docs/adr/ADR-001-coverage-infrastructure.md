# ADR-001: Oficialização da Infraestrutura de Coverage

**Data**: 2026-04-22
**Status**: Aceito
**Contexto**: Fase 0 (Baseline) + preparação para Fase A2 (Coverage Gates)

---

## Contexto

A Fase 0 da baseline de maturidade mediu coverage real usando `@vitest/coverage-v8`, instalado ad hoc para a medição. As configs `vitest.config.ts` dos 3 workspaces já declaravam `coverage: { provider: 'v8' }`, mas o pacote runtime não existia como dependência formal.

Sem este pacote, `vitest run --coverage` falha com `MISSING DEPENDENCY`.

## Decisão

**Oficializar `@vitest/coverage-v8` como parte permanente da stack**, instalado per-workspace com versão exata (sem caret).

### Estratégia adotada: per-workspace, pinado

| Workspace | vitest | @vitest/coverage-v8 |
|-----------|--------|---------------------|
| `apps/api` | `^3.1.0` (resolve 3.2.4) | `3.2.4` (exact) |
| `apps/web` | `^3.2.4` (resolve 3.2.4) | `3.2.4` (exact) |
| `packages/shared` | `^3.1.0` (resolve 3.2.4) | `3.2.4` (exact) |

### Por que per-workspace (não root)

1. **Vitest exige match exato** entre sua versão e a do coverage provider
2. Cada workspace tem seu `vitest.config.ts` com `coverage.provider: 'v8'`
3. Instalar no root com pnpm hoisting pode criar mismatch se workspaces usarem vitest versions diferentes no futuro
4. Per-workspace garante que a dependência é explícita e local

### Por que versão exata (não caret)

1. O coverage provider deve ser **idêntico** à versão do vitest resolvida
2. Caret (`^3.2.4`) poderia resolver para `3.3.0` enquanto vitest permanece `3.2.4` — causando incompatibilidade
3. O custo de atualização manual é baixo (bump simultâneo com vitest)

## Alternativas rejeitadas

| Alternativa | Por que rejeitada |
|-------------|-------------------|
| Instalar no root | Mismatch de versão se workspaces divergirem. Hoisting do pnpm pode mascará-lo |
| Usar `istanbul` provider | v8 é mais rápido, padrão do Vitest, já configurado nos 3 configs |
| Manter como "instalar sob demanda" | Coverage não é opcional — é pré-requisito para gates de CI (Fase A2) |
| Usar caret range | Risco de drift entre vitest e coverage-v8 em resolução automática |

## Consequências

### Positivas
- Coverage executável de forma determinística em qualquer máquina/CI
- Configs existentes (`vitest.config.ts`) passam a funcionar sem instalação extra
- Base sólida para thresholds da Fase A2
- Reprodutibilidade: lockfile registra versão exata

### Negativas
- Atualização de vitest requer bump manual de `@vitest/coverage-v8` nos 3 workspaces
- 1 dependência adicional por workspace (~25 pacotes transitivos)

## Validação

- ✅ `packages/shared`: 208 tests, coverage 86.22% statements
- ✅ `apps/web`: 54 tests, coverage 39.50% statements
- ✅ `apps/api`: 104 tests, coverage 65.30% statements
- ✅ `pnpm run lint`: 4/4 successful
- ✅ `pnpm run build`: 3/3 successful
- ✅ Números idênticos à medição Fase 0

## Conexão com Fase A2

Esta decisão habilita a Fase A2 (Coverage Gates Calibrados):
- Thresholds serão definidos como `baseline - 5%` (fórmula do plano v2)
- API: threshold ~60% stmts
- Web: threshold ~34% stmts
- Shared: threshold ~81% stmts
- Thresholds serão adicionados aos `vitest.config.ts` existentes na propriedade `coverage.thresholds`
