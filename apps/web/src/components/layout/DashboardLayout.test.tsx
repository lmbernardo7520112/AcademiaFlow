import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

// Mocking useAuth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Admin Test', role: 'admin' },
    logout: vi.fn(),
  }),
}));

describe('DashboardLayout — Mobile Navigation', () => {
  it('toggles mobile menu when hamburger button is clicked', () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardLayout />
      </MemoryRouter>
    );

    // Initial state: mobile sidebar is NOT open (no mobile-open class on aside)
    const sidebar = container.querySelector('.sidebar');
    expect(sidebar).not.toHaveClass('mobile-open');

    // Click Hamburger toggle
    const toggleBtn = screen.getByRole('button', { name: /abrir menu/i });
    fireEvent.click(toggleBtn);

    // Sidebar should now have 'mobile-open' class
    expect(sidebar).toHaveClass('mobile-open');

    // Overlay should be visible
    expect(container.querySelector('.sidebar-overlay')).toBeInTheDocument();

    // Click Close button inside sidebar
    const closeBtn = screen.getByRole('button', { name: /fechar menu/i });
    fireEvent.click(closeBtn);

    // Sidebar should be closed again
    expect(sidebar).not.toHaveClass('mobile-open');
  });

  it('closes mobile menu when overlay is clicked', () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardLayout />
      </MemoryRouter>
    );

    // Open menu
    const toggleBtn = screen.getByRole('button', { name: /abrir menu/i });
    fireEvent.click(toggleBtn);

    // Click overlay
    const overlay = container.querySelector('.sidebar-overlay');
    if (overlay) fireEvent.click(overlay);

    // Sidebar should be closed
    const sidebar = container.querySelector('.sidebar');
    expect(sidebar).not.toHaveClass('mobile-open');
  });
});
