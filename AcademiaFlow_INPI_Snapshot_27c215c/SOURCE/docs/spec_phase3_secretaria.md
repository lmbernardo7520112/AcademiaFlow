# Specification: Secretariat Journey (Phase 3)

## Goal
Empower the administrative team with real-time strategic data and efficient management tools for students, classes, and financial tracking.

## 1. Secretariat Dashboard (`SecretariaDashboard.tsx`)
- **KPI Metrics Engine**:
  - `TotalStudents`: Count of active students.
  - `EstimatedRevenue`: Sum of tuition fees for active students.
  - `RetentionRate`: Percentage of active vs. total students.
  - `AcademicSuccess`: Percentage of student/discipline pairs with NF >= 6.0.
  - `CapacityUsage`: (Total Students / (Number of Classes * Average Capacity)).
  - `PendingIssues`: count of missing grades or payments.
- **Visuals**: Dynamic "Metric Cards" with micro-animations and color-coded status (green/yellow/red).

## 2. CRUD Management (Premium)
- **Students**: Enhanced list with search, filter by class, and status toggle.
- **Classes**: Dashboard-style cards showing student count and teacher assignment.
- **Disciplines**: Management of course catalog.

## 3. Reporting Engine
- **Consolidated Export**: Button to generate XLSX/PDF directly from the dashboard (shared/reports).

## 4. UI/UX Dogmas
- **Glassmorphism**: All panels must use `glass-panel` class.
- **Transitions**: Every navigation and list update must use `fade-in` animation.
- **Responsive**: Full mobile support for Secretariat KPIs.
