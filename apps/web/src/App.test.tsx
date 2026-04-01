import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App.js';

describe('App', () => {
  it('should render the application title', () => {
    render(<App />);
    expect(screen.getByText('Flow')).toBeInTheDocument();
  });

  it('should display the tech stack badges', () => {
    render(<App />);
    expect(screen.getByText('React 19')).toBeInTheDocument();
    expect(screen.getByText('Fastify 5')).toBeInTheDocument();
    expect(screen.getByText('Tailwind v4')).toBeInTheDocument();
    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
  });
});
