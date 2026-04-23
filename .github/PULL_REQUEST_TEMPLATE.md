## Descrição

<!-- Descreva de forma breve e objetiva o que esta PR faz -->

## Tipo de mudança

- [ ] Bug fix
- [ ] Feature nova
- [ ] Refatoração (sem mudança funcional)
- [ ] Infraestrutura / CI / Tooling
- [ ] Documentação

## Aceitação e Checklist de Qualidade

> **Nota**: Este PR está sujeito ao rigor do [AI Acceptance Scorecard](../docs/ai-acceptance-scorecard.md). O agente de IA ou desenvolvedor deve comprovar o status de "Concluído" objetivamente.

### Automáticos (Verificados via CI)
- [ ] Lint limpo (`pnpm run lint` — 0 warnings)
- [ ] Type-check limpo (`tsc --noEmit`)
- [ ] Testes passam (`pnpm run test` com thresholds atingidos)
- [ ] Build sem erros (`pnpm run build`)
- [ ] Relatório de governança de dependências sem novas violações

### Manuais (Autor / Revisão)
- [ ] Tipos novos estão em `@academiaflow/shared` (não duplicados)
- [ ] Nenhum arquivo > 400 LOC introduzido ou justificado
- [ ] Testes proporcionais escritos para lógicas críticas novas/alteradas

## Evidência (Obrigatório)

<!-- Apresente provas de execução reais do sistema. Narrativas sem logs ou métricas serão invalidadas. -->

- **Coverage**: `X%` (Antes) → `Y%` (Depois)
- **Testes Adicionados / Ajustados**: `N`
- **Impacto Arquitetural**: `(ex: 0 ciclos introduzidos, topologia mantida)`
- **Runtime Validado**: `(ex: Build verde e validação local estável)`
- **Riscos Remanescentes**: `(Liste se houver, ou "Nenhum mapeado")`
