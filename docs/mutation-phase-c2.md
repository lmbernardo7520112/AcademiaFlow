# Resultados da Fase C2: Consolidação e Expansão de Mutation Testing

**Data de Execução**: 2026-04-23
**Fase do Roadmap**: Fase C2

---

## 1. C2a: Consolidação do Piloto (`grade-calculations.ts`)

A Fase C2a focou em analisar e reagir cirurgicamente à baseline gerada na Fase C1 para o módulo `packages/shared/src/schemas/grade-calculations.ts`.

### Classificação dos 6 Sobreviventes da C1
- **Condicional Redundante (1 mutante)**: `if (mf != null && mf >= APROVACAO_THRESHOLD)`. Classificado como **Equivalente/Redundante por Tipagem**. A verificação `!= null` não possui galho lógico exercitável porque as lógicas anteriores já garantem que as variáveis base não são nulas. O typescript exige a inferência de tipo. Este mutante foi documentado e ignorado para evitar gambiarras no código de produção.
- **Zod Schemas não testados (5 mutantes)**: O schema `boletimConsolidadoSchema` e suas descrições não eram testadas. Classificado como **Teste faltante relevante**.

### Ação Executada
Foi inserido um teste do método `.parse()` validando as chaves primárias do `boletimConsolidadoSchema`. A ferramenta Stryker foi re-executada.

### Resultado Consolidado (C2a)
- **Runtime**: 3 segundos (estável).
- **Mutation Score Anterior**: 90.00%
- **Novo Mutation Score**: **93.33%**
- **Sobreviventes Restantes**: Apenas 4 (1 condicional redundante e 3 `.describe()` estáticos de baixa relevância).

---

## 2. Decisão Condicional: GO para C2b

Atendendo às regras restritas de expansão, a Fase C2b foi engatilhada porque:
1. O runtime de 3s é extremamente saudável.
2. Os sobreviventes foram técnica e justificadamente mapeados.
3. Não houve *test inflation* artificial.

A expansão foi limitada a apenas **1 (um) módulo adicional**, sendo o escolhido: `packages/shared/src/schemas/busca-ativa.ts`.

---

## 3. C2b: Expansão Controlada (`busca-ativa.ts`)

O arquivo `.dependency-cruiser.cjs` não foi alterado, mas o `stryker.config.json` foi expandido para conter:
```json
"mutate": [
  "src/schemas/grade-calculations.ts",
  "src/schemas/busca-ativa.ts"
]
```

### Esclarecimento de Score (Resultados da C2b)
Para fins de clareza e auditoria, existem dois *scores* distintos decorrentes da expansão:
- **Mutation Score Isolado (`busca-ativa.ts`)**: **56.18%**. Este é o índice real de proteção da nova interface testada, demonstrando lacunas significativas de validação estrutural.
- **Mutation Score Agregado (A rodada completa)**: **71.14%** (106 mortos / 39 sobreviventes). Esta é a média ponderada gerada pelo Stryker ao rodar os dois arquivos simultaneamente (`grade-calculations` com 93% + `busca-ativa` com 56%).
- **Runtime Real**: **5 segundos** (Extremamente dentro do budget de 5 minutos).

### Achados Técnicos sobre `busca-ativa.ts`
Os 35 mutantes que sobreviveram no `busca-ativa.ts` são quase inteiramente relacionados à estrutura declarativa do Zod:
1. Mutantes esvaziando chaves de `z.object({})`.
2. Mutantes substituindo operadores aritméticos nos limites (`5 * 1024 / 1024`).
3. Mutantes apagando chaves estáticas de Enums ou descrições (`.describe("")`).

**Conclusão Tática**: A suíte de testes de `busca-ativa.ts` garante os fluxos lógicos principais, mas está ignorando completamente a validação dos contratos do Zod (schemas e sub-schemas).

---

## 4. Conclusão e Recomendação Final

O escopo desta Fase C2 determinava um limite estrito de exploração (C2a + C2b para 1 módulo máximo). Essa regra foi rigorosamente cumprida, prevenindo timeout, exaustão computacional e fadiga técnica prematura.

### Recomendação Estratégica (Próximos Passos):
Com base nas evidências geradas:
Recomenda-se **Voltar ao roadmap e avaliar B2**.
O Mutation Testing já cumpriu seu papel de ferramenta investigativa na base e provou ser perfeitamente executável na stack de Vite. Expandir indiscriminadamente agora seria prematuro dado que o B1 (Dependency Governance) ainda está rodando em modo puramente observacional. A equipe deve estabilizar e aprovar a fase B2 (bloqueio de dependências) para solidificar o monorepo antes de se preocupar em atingir 90%+ de score de mutação em módulos de interface que podem vir a ser refatorados na própria consolidação das fronteiras.
