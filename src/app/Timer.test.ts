import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Timer from './Timer';

describe('Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should measure elapsed time correctly', () => {
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    vi.setSystemTime(startDate);

    const timer = new Timer();

    const endDate = new Date('2025-01-01T00:00:05.500Z');
    vi.setSystemTime(endDate);

    const elapsed = timer.stop();

    expect(elapsed).toBe(5500);
  });

  it('should start timing from construction', () => {
    const startDate = new Date('2025-01-01T12:00:00.000Z');
    vi.setSystemTime(startDate);

    const timer = new Timer();

    vi.advanceTimersByTime(1000);

    const elapsed = timer.stop();

    expect(elapsed).toBe(1000);
  });

  it('should return 0 when stopped immediately', () => {
    const timer = new Timer();
    const elapsed = timer.stop();

    expect(elapsed).toBe(0);
  });

  it('should handle millisecond precision', () => {
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    vi.setSystemTime(startDate);

    const timer = new Timer();

    vi.advanceTimersByTime(123);

    const elapsed = timer.stop();

    expect(elapsed).toBe(123);
  });
});
