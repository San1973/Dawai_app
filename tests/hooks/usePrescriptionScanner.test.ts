import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePrescriptionScanner } from '../../hooks/usePrescriptionScanner';

describe('usePrescriptionScanner', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => usePrescriptionScanner());
    expect(result.current.status).toBe('idle');
  });

  it('moves to scanning on start', () => {
    const { result } = renderHook(() => usePrescriptionScanner());
    act(() => {
      result.current.startScanning();
    });
    expect(result.current.status).toBe('scanning');
  });

  // Mock file input / camera stream would go here (more advanced)
});
