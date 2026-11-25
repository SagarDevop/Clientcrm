import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PackageBuilder } from '../components/forms/PackageBuilder.jsx';

describe('PackageBuilder Component', () => {
  it('renders structured package builder with default quantities', () => {
    const handleChange = vi.fn();
    render(<PackageBuilder value="" onChange={handleChange} />);

    expect(screen.getByText('Service Package & Deliverables Builder')).toBeInTheDocument();
    expect(screen.getByText('Quick Builder')).toBeInTheDocument();
    expect(screen.getByText(/Instagram Reels/i)).toBeInTheDocument();
    expect(screen.getByText(/Static Posts/i)).toBeInTheDocument();
  });

  it('adds and removes custom deliverables', () => {
    const handleChange = vi.fn();
    render(<PackageBuilder value="" onChange={handleChange} />);

    const input = screen.getByPlaceholderText(/Google My Business SEO/i);
    fireEvent.change(input, { target: { value: 'Google My Business SEO & Reviews' } });

    const addBtn = screen.getByText('Add');
    fireEvent.click(addBtn);

    expect(handleChange).toHaveBeenCalledWith(expect.stringContaining('Google My Business SEO & Reviews'));
  });

  it('switches between Quick Builder and Raw Text mode', () => {
    const handleChange = vi.fn();
    render(<PackageBuilder value="• Initial package details" onChange={handleChange} />);

    const rawTextBtn = screen.getByText('Raw Text');
    fireEvent.click(rawTextBtn);

    const textarea = screen.getByPlaceholderText(/Type or edit raw package deliverables/i);
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: '• Custom deliverable edited' } });
    expect(handleChange).toHaveBeenCalledWith('• Custom deliverable edited');
  });
});
