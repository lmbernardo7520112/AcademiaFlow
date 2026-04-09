# Specification: Role-Based Routing & Redirection (v2)

## Goal
Implement a robust redirection system that ensures users are navigated to the correct dashboard based on their role (`professor`, `secretaria`, `admin`, `administrador`).

## 1. Role Groups
- **Professor Area**: Dedicated to users with the `professor` role.
  - Base Route: `/professor`
- **Secretaria/Admin Area**: Dedicated to `secretaria`, `admin`, and `administrador` roles.
  - Base Route: `/secretaria`

## 2. Redirection Logic (`RoleRedirect` component)
- **Condition: Not Logged In**
  - Expected: Redirect to `/auth/login`.
- **Condition: Logged In as `professor`**
  - Expected: Redirect to `/professor`.
- **Condition: Logged In as `secretaria`, `admin`, or `administrador`**
  - Expected: Redirect to `/secretaria`.
- **Condition: Logged In with unknown role**
  - Expected: Redirect to `/auth/login` (fallback).

## 3. Route Structure (`App.tsx`)
```typescript
<Routes>
  {/* Public */}
  <Route path="/" element={<RoleRedirect />} />
  <Route path="/auth/login" element={<Login />} />
  
  {/* Professor Journey */}
  <Route element={<ProtectedRoute allowedRoles={['professor']} />}>
    <Route path="/professor" element={<ProfessorDashboard />} />
    <Route path="/professor/notas" element={<GradeManagement />} />
    <Route path="/professor/ai" element={<ProfessorAI />} />
  </Route>
  
  {/* Secretaria Journey */}
  <Route element={<ProtectedRoute allowedRoles={['secretaria', 'admin', 'administrador']} />}>
    <Route path="/secretaria" element={<SecretariaDashboard />} />
    <Route path="/secretaria/turmas" element={<TurmasPage />} />
    <Route path="/secretaria/alunos" element={<AlunosPage />} />
    <Route path="/secretaria/disciplinas" element={<DisciplinasPage />} />
  </Route>
</Routes>
```

## 4. Dynamic Layout (`DashboardLayout.tsx`)
- Sidebar `navItems` must filter based on `user.role`.
- Logout functionality must clear tokens and redirect to `/`.
