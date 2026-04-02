# Specification: Professor Journey (Phase 2)

## Goal
Provide a premium, high-performance interface for teachers to manage their assigned disciplines and input student grades with real-time feedback.

## 1. Professor Dashboard (`ProfessorDashboard.tsx`)
- **Data Fetching**: `GET /api/professor/disciplinas` (must be implemented in API).
- **UI**: Grid of `DisciplineCard` components.
- **Micro-interaction**: Hover effects on cards, skeleton loading states.

## 2. Grade Management (`GradeManagement.tsx`)
- **Selection**: Inherits `turmaId` and `disciplinaId` from URL params.
- **Data Consolidator**: Combines results from `GET /api/alunos?turmaId=...` and `GET /api/notas/boletim/:turmaId/:disciplinaId` (new endpoint needed).
- **Table Structure**:
  - `Aluno`: Name and Matricula.
  - `B1`, `B2`, `B3`, `B4`: Editable inputs (0-10).
  - `NF`: Calculated automatically (shared/grade-calculations).
  - `PF`: Editable (if NF < 6.0).
  - `MG` / `MF`: Calculated.
  - `Situation`: Aproved, Recovery, Failed, Pending.
- **Saving**: Bulk save of all modified cells.

## 3. UI Components
- **`DisciplineCard`**: Glassmorphism card showing Name, Code, and Turma.
- **`GradeTable`**: Interactive table with sticky headers and responsive cells.
