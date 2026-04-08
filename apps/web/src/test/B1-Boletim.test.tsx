import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import App from '../App';

// Mock specific pages to detect routing
vi.mock('../pages/dashboard/BoletimIndividualPage', () => ({
  default: () => <div data-testid="boletim-page">BoletimPage</div>
}));
vi.mock('../pages/dashboard/SecretariaDashboard', () => ({
  default: () => <div data-testid="secretaria-page">SecretariaDashboard</div>
}));

vi.mock('../contexts/AuthContext', async () => {
  return {
    useAuth: () => ({
      isAuthenticated: true,
      user: { role: 'secretaria', name: 'Valdir', id: '123', tenantId: 'tenant1' },
      logout: vi.fn()
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
  };
});

describe('B1: Boletim Individual', () => {
  it('Secretaria deve abrir o boletim sem ser redirecionada', async () => {
    // Configura a URL na montagem
    window.history.pushState({}, '', '/dashboard/alunos/student-1/boletim');
    
    render(<App />);
    
    // Testa o que renderizou! O comportamento atual vai falhar pois Secretaria toma redirect para '/' que então manda para '/secretaria'
    await waitFor(() => {
      const isBoletim = screen.queryByTestId('boletim-page') !== null;
      
      expect(isBoletim).toBe(true);
      expect(screen.getByTestId('boletim-page')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
