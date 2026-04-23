# ADR-002: Adiamento do Smoke Test no CI

**Data**: 2026-04-23
**Status**: Aceito
**Contexto**: Fase A1.5 do Plano de Elevação de Maturidade

---

## Contexto

O plano de maturidade (Fase A1.5) previa integrar o smoke test existente
(`apps/api/src/scripts/smoke-test-hardening.ts`) ao CI, caso fosse seguro.

## Análise

O smoke test foi auditado e apresenta os seguintes problemas:

1. **Mutação de `process.env.APP_MODE`** em runtime — altera estado global,
   comportamento não-determinístico se executado junto com outros steps
2. **Cleanup incompleto** — TEST 3 cria `legacy@test.com` no banco mas não remove
3. **Conflito com seed pipeline** — o CI já faz `seed → validate-seed`;
   o smoke test cria dados que podem invalidar a validação
4. **Não-idempotente** — depende de que certos usuários não existam previamente

## Decisão

**Adiar a integração** do smoke test no CI para uma fase posterior, quando:
- o script for refatorado para ser idempotente
- o cleanup for completo (before/after)
- a mutação de `APP_MODE` for substituída por parametrização explícita
- a ordem no pipeline for definida sem conflito com seed

## Consequências

- O CI permanece sem smoke test de hardening (aceitável — os testes de auth
  em `vitest` já cobrem a maioria dos cenários)
- A Fase A1 é concluída com 4 de 5 quick wins executados + 1 formalmente adiado
- O smoke test permanece disponível para execução manual local
