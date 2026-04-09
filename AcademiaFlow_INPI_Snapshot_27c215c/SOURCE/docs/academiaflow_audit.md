# AcademiaFlow: Auditoria Arquitetural Sistemática

Esta auditoria documenta a estrutura técnica, fluxos de dados e inovações arquiteturais do sistema **AcademiaFlow**, uma plataforma de gestão educacional B2B com inteligência artificial integrada.

---

## 1. Arquitetura do Sistema e Stack Tecnológica

O AcademiaFlow utiliza uma estrutura de **Monorepo** gerenciada pelo **pnpm** e **Turborepo**, garantindo consistência de tipos e contratos entre o Backend e o Frontend.

### Pilha Tecnológica (Core)
*   **Backend**: [Fastify](https://www.fastify.io/) (Node.js) - Escolhido pela alta performance e suporte nativo a JSON Schema/Zod.
*   **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) - Foco em interfaces SPA rápidas e responsivas.
*   **Banco de Dados**: [MongoDB](https://www.mongodb.com/) via **Mongoose** - Flexibilidade para modelos educacionais e histórico de IA.
*   **Validação**: [Zod](https://zod.dev/) - Única fonte de verdade para contratos de dados (Shared Schemas).
*   **Inteligência Artificial**: [Google Gemini AI](https://ai.google.dev/) - Motor de geração pedagógica (AI Reactor).
*   **Segurança**: JWT (JSON Web Token) com isolamento por **TenantId** (Multi-tenancy).

---

## 2. Catálogo de Rotas de API (@academiaflow/api)

Todas as rotas seguem o padrão RESTful e utilizam o prefixo `/api`. O sistema implementa **RBAC** (Role-Based Access Control) rigoroso.

| Módulo | Prefixo | Descrição | Principais Endpoints | Roles Permitidas |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth` | Gestão de acesso e usuários | `POST /login`, `POST /register`, `GET /me`, `POST /refresh` | Livre/Admin |
| **Alunos** | `/api/alunos` | CRUD e Gestão de Status | `POST /`, `GET /:id`, `PATCH /:id/status` | Secretaria, Admin |
| **Turmas** | `/api/turmas` | Organização de classes | `POST /`, `GET /`, `PUT /:id` | Secretaria, Admin |
| **Disciplinas** | `/api/disciplinas` | Cadastro de matérias | `POST /`, `DELETE /:id` | Secretaria, Admin |
| **Notas** | `/api/notas` | Avaliações e Boletins | `POST /bulk` (Lote), `GET /boletim/:turmaId/:disciplinaId` | Professor, Admin |
| **Reports** | `/api/reports` | Inteligência de Negócio | `GET /dashboard`, `GET /turmas/taxas`, `GET /export` | Admin, Secretaria |
| **AI Reactor** | `/api/ai` | Motor Pedagógico IA | `POST /generate-activity`, `POST /pedagogical/analysis` | Professor, Admin |

---

## 3. Dicionário de Modelos de Dados (Mongoose)

O sistema opera com um modelo de **Multi-tenancy Silo**, onde cada documento possui um `tenantId` para isolamento lógico.

### Entidades Core
*   **User**: Gerencia credenciais e papéis (`admin`, `secretaria`, `professor`).
*   **Aluno**: Contém dados acadêmicos, financeiros (`valorMensalidade`) e status (`ativo`, `transferido`, `abandono`).
*   **Nota**: Centraliza o desempenho estudantil por bimestre (1 a 5), vinculando Aluno, Disciplina e Turma com índice composto para evitar duplicidade.
*   **Turma/Disciplina**: Estrutura organizacional da instituição.
*   **ValidacaoPedagogica**: Armazena as análises geradas pelo motor de IA para histórico e auditoria do professor.

---

## 4. Ecossistema de Dashboard e Métricas

O **Painel Estratégico** (@academiaflow/web) consome métricas agregadas do `ReportsService`.

### KPIs de Gestão (Secretária/Admin)
*   **Alunos Ativos vs Inativos**: Monitoramento de base instalada.
*   **Receita Mensal Estimada**: Calculada dinamicamente via `$sum` no Mongoose sobre o campo `valorMensalidade` de alunos ativos.
*   **Taxa de Ocupação**: Relaciona o número de alunos ativos com a capacidade total das turmas (Base: 40 alunos/sala).
*   **Taxa de Evasão**: Alerta crítico baseado no status `abandono`.

### Performance Acadêmica
*   **Média Geral do Sistema**: Consolidação de todas as notas do período.
*   **Taxa de Aprovação por Turma**: Visualização ranking para identificação de turmas em risco.

---

## 5. Inovação: AI Reactor 2.0 (Inteligência Artificial)

A arquitetura do motor de IA é desacoplada através de **Providers**, permitindo alternar entre `GeminiProvider` (Real) e `MockLLMProvider` (Testes/Custo Zero).

### Fluxos AI
1.  **Geração de Atividades**: Cria exercícios personalizados com base em tópicos e nível de dificuldade.
2.  **Análise Pedagógica**: O sistema lê as notas dos alunos, identifica padrões de erro e sugere intervenções.
3.  **Exercícios de Recuperação**: Gera conteúdo específico para alunos que não atingiram a média em determinados bimestres.

---

> [!TIP]
> **Segurança de Dados**: O isolamento por `tenantId` é aplicado em nível de Injeção de Dependência no service layer, garantindo que mesmo um erro de rota não exponha dados de outras escolas.

> [!NOTE]
> Documentação gerada em 03/04/2026 como parte da auditoria técnica sistemática.
