import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MedicineCard } from '../../components/MedicineCard';

describe('MedicineCard', () => {
  const sampleMed = {
    name: 'Metformin 500mg',
    dosage: '1-0-1',
    timing: 'after food',
    urgency: 'high' as const,
    transliteration: 'मेटफॉर्मिन',
  };

  it('shows medicine name and dosage', () => {
    render(<MedicineCard medicine={sampleMed} />);
    expect(screen.getByText('Metformin 500mg')).toBeInTheDocument();
    expect(screen.getByText(/1-0-1/)).toBeInTheDocument();
  });

  it('displays transliteration when language is Indic', () => {
    render(<MedicineCard medicine={sampleMed} lang="hi" />);
    expect(screen.getByText(/मेटफॉर्मिन/)).toBeInTheDocument();
  });

  it('applies red border/high urgency styling', () => {
    render(<MedicineCard medicine={sampleMed} />);
    const card = screen.getByTestId('medicine-card'); // add data-testid="medicine-card" in component
    expect(card).toHaveClass('border-red-500');
  });

  it('shows "after food" instruction', () => {
    render(<MedicineCard medicine={sampleMed} />);
    expect(screen.getByText(/after food/i)).toBeInTheDocument();
  });
});
