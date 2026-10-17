import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../app/App.jsx';

describe('App smoke test', () => {
  it('renders the application heading and client-side badge', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /PDFTooling/i })).toBeInTheDocument();
    expect(screen.getByText(/Client-Side Only/i)).toBeInTheDocument();
  });
});
