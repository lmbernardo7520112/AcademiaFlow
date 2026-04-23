## Descrição

<!-- Descreva de forma breve e objetiva o que esta PR faz -->

## Tipo de mudança

- [ ] Bug fix
- [ ] Feature nova
- [ ] Refatoração (sem mudança funcional)
- [ ] Infraestrutura / CI / Tooling
- [ ] Documentação

## Checklist de qualidade

### Automáticos (CI deve passar)
- [ ] Lint limpo (`pnpm run lint` — 0 warnings)
- [ ] Type-check limpo (`tsc --noEmit`)
- [ ] Testes passam (`pnpm run test`)
- [ ] Build sem erros (`pnpm run build`)

### Manuais (autor deve verificar)
- [ ] Tipos novos estão em `@academiaflow/shared` (não duplicados localmente)
- [ ] Nenhum arquivo > 400 LOC criado
- [ ] Nenhuma dependência adicionada como `"latest"`
- [ ] Se lógica de negócio: testes unitários adicionados/atualizados

## Evidência

<!-- Preencha com dados reais -->

- Coverage antes: `X%` → depois: `Y%`
- Testes adicionados: N
- Complexidade máxima introduzida: CC=N
