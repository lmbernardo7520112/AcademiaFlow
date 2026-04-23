# AI Acceptance Scorecard

**Data de Implementação**: 2026-04-23
**Fase do Roadmap**: Fase E

## 1. Propósito
Definir critérios objetivos, observáveis e não-negociáveis para aceitar código gerado por IA (ou com forte assistência de IA) no monorepo do AcademiaFlow. O objetivo é evitar regressão técnica, prevenir *drift* arquitetural e garantir que a IA gere provas de execução (evidências), e não apenas narrativas de sucesso.

## 2. Quando Usar
Este scorecard aplica-se a **todos os Pull Requests** criados durante a implementação de novas features, correções ou refatorações realizadas com o auxílio do agente Antigravity ou outras IAs.

## 3. Gates Automáticos (Requisitos Mínimos)
A execução de um PR **deve** satisfazer as seguintes métricas validadas via CI:
- [ ] **Lint**: Limpo (`0 warnings`, validado pelo CI).
- [ ] **Typecheck**: Limpo em todos os pacotes.
- [ ] **Testes**: 100% dos testes passando (`pnpm run test`).
- [ ] **Coverage**: Não regrediu abaixo dos thresholds calibrados (API: 60%, Web: 34%, Shared: 81%).
- [ ] **Arquitetura**: Zero novas violações de ciclo e limites de *workspace* (via `dependency-cruiser`).
- [ ] **Build**: Todos os pacotes e imagens compilam perfeitamente.

## 4. Gates Semiautomáticos / Manuais
A execução da tarefa só pode ser validada humanamente caso obedeça às premissas:
- [ ] **Engenharia de Tipos**: Tipos de domínio e interfaces principais inseridos ou modificados habitam `@academiaflow/shared`, não duplicados localmente.
- [ ] **Size Budget**: Nenhum arquivo modificado ultrapassa o limite prudencial (400 LOC) sem justificativa estritamente documentada.
- [ ] **Evidência Explícita**: O template do PR foi preenchido com dados *reais* de execução.
- [ ] **Teste Proporcional**: Alterações em lógica crítica de negócio possuem testes proporcionais que reflitam as novas variações/falhas induzidas na tarefa.
- [ ] **Degradação Graciosa (se aplicável)**: Funcionalidades que envolvam prompts, AI services ou APIs externas foram devidamente tipadas e mitigadas contra timeouts ou retornos não-estruturados.

## 5. Critério de "Tarefa Concluída" (Agente de IA)
Para o Antigravity considerar um bloco de trabalho "Concluído", a IA deve:
1. Apresentar CI verde (não necessariamente por execução do GitHub, mas comprovado em ambiente de terminal local isolado no ambiente de dev).
2. Reportar logs claros das saídas de Coverage, Lint, Depcruise e Test.
3. Não misturar refatorações opportunistas fora do plano de trabalho pactuado.
4. Apresentar um documento tipo `walkthrough.md` com a narrativa e evidências estritas.
5. **Proibido Declarar Sucesso sem Provas**: Uma tarefa finaliza na *validação*, não no *coding*.

## 6. Anti-Padrões Proibidos
- *Workarounds* suprimindo alertas explícitos de tipagem (`@ts-ignore` ou casting brutal `as any` sem motivação exaurida).
- Endurecimento acidental de regras configuradas em modo *observacional* (ex: transformar `warn` de dependências em `error` sem passar de fase).
- Quebras de retrocompatibilidade em DTOs e *Schemas* compartilhados com o banco de dados e APIs externas sem aviso prévio.

## 7. Fases e Escopo
A aceitação é regida pelo Princípio de Responsabilidade Restrita: o código só pode ser aceito se resolve estritamente o problema da issue referenciada, respeitando os contratos da fase de maturidade atual.
