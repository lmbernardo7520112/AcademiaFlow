import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';


// Mock IntersectionObserver for jsdom
beforeEach(() => {
  const mockIntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);
});

describe('LandingPage — school_production mode', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('always renders "Acessar Painel" button', async () => {
    vi.doMock('../../config/appMode', () => ({
      isSelfServiceEnabled: false,
      isSchoolProduction: true,
    }));

    const { default: LandingPageModule } = await import('./LandingPage');

    render(
      <MemoryRouter>
        <LandingPageModule />
      </MemoryRouter>
    );

    expect(screen.getByText('Acessar Painel')).toBeInTheDocument();
  });

  it('hides "Teste como Diretor" button when APP_MODE=school_production', async () => {
    vi.doMock('../../config/appMode', () => ({
      isSelfServiceEnabled: false,
      isSchoolProduction: true,
    }));

    const { default: LandingPageModule } = await import('./LandingPage');

    render(
      <MemoryRouter>
        <LandingPageModule />
      </MemoryRouter>
    );

    expect(screen.queryByText('Teste como Diretor')).not.toBeInTheDocument();
  });

  it('hides "Implementar na Minha Escola" CTA when APP_MODE=school_production', async () => {
    vi.doMock('../../config/appMode', () => ({
      isSelfServiceEnabled: false,
      isSchoolProduction: true,
    }));

    const { default: LandingPageModule } = await import('./LandingPage');

    render(
      <MemoryRouter>
        <LandingPageModule />
      </MemoryRouter>
    );

    expect(screen.queryByText('Implementar na Minha Escola')).not.toBeInTheDocument();
  });

  it('hides "Reinventar Minha Escola" CTA when APP_MODE=school_production', async () => {
    vi.doMock('../../config/appMode', () => ({
      isSelfServiceEnabled: false,
      isSchoolProduction: true,
    }));

    const { default: LandingPageModule } = await import('./LandingPage');

    render(
      <MemoryRouter>
        <LandingPageModule />
      </MemoryRouter>
    );

    expect(screen.queryByText('Reinventar Minha Escola')).not.toBeInTheDocument();
  });
});

describe('LandingPage — demo mode', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('shows "Teste como Diretor" button when APP_MODE=demo', async () => {
    vi.doMock('../../config/appMode', () => ({
      isSelfServiceEnabled: true,
      isSchoolProduction: false,
    }));

    const { default: LandingPageModule } = await import('./LandingPage');

    render(
      <MemoryRouter>
        <LandingPageModule />
      </MemoryRouter>
    );

    expect(screen.getByText('Teste como Diretor')).toBeInTheDocument();
  });

  it('shows "Implementar na Minha Escola" CTA when APP_MODE=demo', async () => {
    vi.doMock('../../config/appMode', () => ({
      isSelfServiceEnabled: true,
      isSchoolProduction: false,
    }));

    const { default: LandingPageModule } = await import('./LandingPage');

    render(
      <MemoryRouter>
        <LandingPageModule />
      </MemoryRouter>
    );

    expect(screen.getByText('Implementar na Minha Escola')).toBeInTheDocument();
  });

  it('shows "Reinventar Minha Escola" CTA when APP_MODE=demo', async () => {
    vi.doMock('../../config/appMode', () => ({
      isSelfServiceEnabled: true,
      isSchoolProduction: false,
    }));

    const { default: LandingPageModule } = await import('./LandingPage');

    render(
      <MemoryRouter>
        <LandingPageModule />
      </MemoryRouter>
    );

    expect(screen.getByText('Reinventar Minha Escola')).toBeInTheDocument();
  });
});
