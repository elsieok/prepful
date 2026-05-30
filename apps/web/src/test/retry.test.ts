import { describe, it, expect, vi } from 'vitest';
import { withRetry } from 'lib';

describe('withRetry', () => {
  // --- existing tests ---

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, 3, 0);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, 3, 0)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  // --- new tests ---

  it('returns the resolved value, not just "ok"', async () => {
    // Makes sure the actual return value is passed through unchanged
    const fn = vi.fn().mockResolvedValue({ score: 99 });
    const result = await withRetry(fn);
    expect(result).toEqual({ score: 99 });
  });

  it('defaults to 3 max attempts', async () => {
    // Confirms the default maxAttempts=3 without passing it explicitly
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(withRetry(fn, undefined, 0)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('re-throws the original error, not a wrapper', async () => {
    // The caller should receive the real error, not "Max retries exceeded"
    const original = new Error('real error');
    const fn = vi.fn().mockRejectedValue(original);
    await expect(withRetry(fn, 2, 0)).rejects.toBe(original);
  });

  it('stops retrying as soon as one attempt succeeds', async () => {
    // Fails twice, succeeds on third — should not attempt a fourth time
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('finally');
    const result = await withRetry(fn, 5, 0);
    expect(result).toBe('finally');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('with maxAttempts=1 never retries', async () => {
    // A single-attempt policy should fail immediately without retrying
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(withRetry(fn, 1, 0)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});