import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyedSaver, flushAllAutosaves, registerFlusher } from './autosave';

describe('KeyedSaver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces and saves only the latest value per key', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = new KeyedSaver<string>({ save, delay: 700 });

    saver.schedule(1, 'a');
    saver.schedule(1, 'ab');
    saver.schedule(1, 'abc');
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(700);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('abc');
  });

  it('keeps edits to an item when another item is edited next (no dropped saves)', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = new KeyedSaver<string>({ save, delay: 700 });

    saver.schedule('chapter-1', 'edited chapter one');
    await vi.advanceTimersByTimeAsync(300);
    saver.schedule('chapter-2', 'edited chapter two');

    await vi.advanceTimersByTimeAsync(700);
    expect(save.mock.calls.map((c) => c[0]).sort()).toEqual(['edited chapter one', 'edited chapter two']);
  });

  it('flush() saves immediately, e.g. on unmount or before closing', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = new KeyedSaver<string>({ save, delay: 700 });

    saver.schedule(1, 'pending');
    await saver.flush();
    expect(save).toHaveBeenCalledWith('pending');

    // Nothing left for the timer to do.
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('cancel() drops a pending save', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = new KeyedSaver<string>({ save, delay: 700 });

    saver.schedule(1, 'deleted item');
    saver.cancel(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).not.toHaveBeenCalled();
  });

  it('runs saves in order across flushes', async () => {
    const order: string[] = [];
    let release: () => void = () => undefined;
    const first = new Promise<void>((resolve) => {
      release = resolve;
    });
    const save = vi.fn(async (value: string) => {
      if (value === 'v1') await first;
      order.push(value);
    });
    const saver = new KeyedSaver<string>({ save, delay: 10 });

    saver.schedule(1, 'v1');
    const p1 = saver.flush();
    saver.schedule(1, 'v2');
    const p2 = saver.flush();
    release();
    await Promise.all([p1, p2]);
    expect(order).toEqual(['v1', 'v2']);
  });

  it('reports status and errors', async () => {
    const statuses: string[] = [];
    const saver = new KeyedSaver<string>({
      save: () => Promise.reject(new Error('disk full')),
      delay: 10,
      onStatus: (status) => statuses.push(status),
    });

    saver.schedule(1, 'x');
    await expect(saver.flush()).rejects.toThrow('disk full');
    expect(statuses).toEqual(['pending', 'saving', 'error']);
  });
});

describe('flushAllAutosaves', () => {
  it('flushes every registered saver and survives failures', async () => {
    const ok = vi.fn().mockResolvedValue(undefined);
    const failing = vi.fn().mockRejectedValue(new Error('boom'));
    const unregisterA = registerFlusher(ok);
    const unregisterB = registerFlusher(failing);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await flushAllAutosaves();
    expect(ok).toHaveBeenCalled();
    expect(failing).toHaveBeenCalled();

    unregisterA();
    unregisterB();
    consoleError.mockRestore();
  });
});
