import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Frontend Smoke Test', () => {
  it('renders the Champions Club application root successfully', () => {
    render(<App />);

    // Brand title is visible
    expect(screen.getAllByText(/CHAMPIONS/i).length).toBeGreaterThan(0);

    // Hero title is visible
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Champions Club/i);

    // Navigation buttons for Member Portal and Staff Console are present
    expect(screen.getByRole('link', { name: /Member Portal/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Staff Console/i })).toBeInTheDocument();
  });

  it('renders key business rules and facilities on home page', () => {
    render(<App />);

    expect(screen.getByText(/60 Min Fixed/i)).toBeInTheDocument();
    expect(screen.getByText(/30 Min Starts/i)).toBeInTheDocument();
    expect(screen.getByText(/Max 2 \/ Member/i)).toBeInTheDocument();
  });
});
