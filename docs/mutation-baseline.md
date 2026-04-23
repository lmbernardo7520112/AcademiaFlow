# Baseline de Mutation Testing (Piloto - Fase C1)

**Data de Execução**: 2026-04-23
**Commit HEAD**: `ae763c3` (Branch `main`)
**Ferramenta Usada**: `@stryker-mutator/core ^9.6.1` e `@stryker-mutator/vitest-runner ^9.6.1`

---

## 1. Escopo Analisado
O piloto foi estritamente focado em um módulo crítico, puro e matemático do domínio compartilhado:
- **Alvo**: `packages/shared/src/schemas/grade-calculations.ts`

## 2. Comando e Configuração
**Comando**: `npx stryker run` (via `pnpm run stryker` no pacote `@academiaflow/shared`)
**Configuração (`stryker.config.json`)**: Vitest runner, reporter progress/clear-text, análise `perTest`. Nenhuma integração com CI/CD foi habilitada.

## 3. Performance (Runtime)
- **Tempo Real**: `3 segundos` (Muito abaixo do budget prudencial de 5 minutos).
- **Processos (Concurrency)**: 15 workers.

## 4. Resultados Obtidos
- **Mutation Score**: **90.00%** (54 mortos / 6 sobreviventes / 60 total).
- **Cobertura de Código original**: 100% de linhas no vitest-coverage para as lógicas matemáticas.

## 5. Mutantes Sobreviventes Relevantes

Houve 6 mutantes que resistiram à suíte atual de testes (`grade-calculations.test.ts`), revelando duas categorias de *blind spots* (pontos cegos):

### Categoria A: Condicionais Redundantes (1 sobrevivente)
```diff
// Linha 67
- if (mf != null && mf >= APROVACAO_THRESHOLD) return 'Aprovado';
+ if (true && mf >= APROVACAO_THRESHOLD) return 'Aprovado';
```
**Análise**: A lógica anterior do método `determineSituacao` já assegura o early-return se `mg == null`. Logo, se o código chega nesta linha para analisar `pf`, a função interna `calculateMF(mg, pf)` garantidamente retornará um número. A verificação `mf != null` é morta/redundante. A suíte de testes nunca forçará `mf` a ser `null` nesse galho.

### Categoria B: Schemas Estáticos não Testados (5 sobreviventes)
```diff
// Linhas 80-97
- export const boletimConsolidadoSchema = z.object({ ... });
+ export const boletimConsolidadoSchema = z.object({});

- mf: z.number().nullable().describe('Média Final (com PF se aplicável)'),
+ mf: z.number().nullable().describe(""),
```
**Análise**: O arquivo exporta um schema `Zod` inteiro (`boletimConsolidadoSchema`) e descrições semânticas. O teste foca nas lógicas puras de cálculo e ignora os schemas exportados estaticamente.

## 6. Interpretação Técnica e Decisão

**Interpretação**:
O score de **90%** em uma suíte primária sem TDD guiado por mutação é excepcionalmente bom, refletindo que os testes de limites de nota (`>= 6.0`, `< 4.0`) estão robustos e conseguem matar as falsificações de operadores lógicos (os mutantes mais perigosos). Os mutantes sobreviventes apontam para uma redundância no código-fonte e para ausência de validação estrutural do schema zod. O piloto foi rápido (3s), indolor e cumpriu rigorosamente seu papel observacional.

**Decisão sobre C2 (Correção Sistêmica)**:
✅ **PRONTO PARA C2**.
A ferramenta provou ser compatível com a arquitetura `pnpm workspaces` + `vitest` e rodar em tempo aceitável para escopos atômicos. O repositório agora tem o ferramental instalado, estabilizado, e os dados provam que há oportunidades reais de blindagem (Remoção da redundância em `grade-calculations.ts` ou melhoria da suíte). A expansão poderá ser ditada com extrema granularidade na Fase C2.
