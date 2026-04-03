import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import RoleRedirect from './RoleRedirect';
import { useAuth } from '../../contexts/AuthContext';

// Mock useAuth
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('RoleRedirect Component', () => {
  const renderWithRouter = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/auth/login" element={<div>Login Page</div>} />
          <Route path="/professor" element={<div>Professor Dashboard</div>} />
          <Route path="/secretaria" element={<div>Secretaria Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('should redirect to /auth/login if not authenticated', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    renderWithRouter();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('should redirect to /professor if user is a professor', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { role: 'professor' },
    });

    renderWithRouter();
    expect(screen.getByText('Professor Dashboard')).toBeInTheDocument();
  });

  it('should redirect to /secretaria if user is secretaria', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { role: 'secretaria' },
    });

    renderWithRouter();
    expect(screen.getByText('Secretaria Dashboard')).toBeInTheDocument();
  });

  it('should redirect to /secretaria if user is admin', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { role: 'admin' },
    });

    renderWithRouter();
    expect(screen.getByText('Secretaria Dashboard')).toBeInTheDocument();
  });

  it('should redirect to /secretaria if user is administrador', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { role: 'administrador' },
    });

    renderWithRouter();
    expect(screen.getByText('Secretaria Dashboard')).toBeInTheDocument();
  });
});
