# 🧭 AcademiaFlow

[![CI](https://github.com/lmbernardo7520112/AcademiaFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/lmbernardo7520112/AcademiaFlow/actions)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![Fastify](https://img.shields.io/badge/Fastify-5-black?style=flat-square&logo=fastify)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat-square&logo=tailwindcss)
![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=flat-square&logo=turborepo)

**Sistema de Gestão Acadêmica com IA** — plataforma web que integra as jornadas de Professor, Secretaria e Coordenação com geração de atividades pedagógicas via Google Gemini.

## 🏗️ Arquitetura

```
AcademiaFlow/
├── apps/
│   ├── api/          → Fastify 5 + Mongoose + JWT
│   └── web/          → React 19 + Vite 6 + Tailwind v4
├── packages/
│   └── shared/       → Zod schemas + TypeScript types
└── turbo.json        → Turborepo pipeline
```

## 🚀 Quick Start

```bash
# Instale as dependências
pnpm install

# Inicie todos os workspaces em paralelo
pnpm dev

# Frontend → http://localhost:5173
# Backend  → http://localhost:3000
```

## 🧪 Metodologia

- **SDD** — Specification Driven Development (Zod schemas como contratos)
- **TDD** — Test Driven Development (Red → Green → Refactor)
- **Clean Code** — Zero `any`, structured logging, feature-sliced architecture

## 📜 Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia todos os workspaces em modo desenvolvimento |
| `pnpm build` | Build de produção de todos os workspaces |
| `pnpm test` | Executa todos os testes (Vitest) |
| `pnpm lint` | Executa ESLint em todos os workspaces |
| `pnpm format` | Formata código com Prettier |

## 📝 Licença

MIT — Leonardo Maximino Bernardo
