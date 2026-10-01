export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface KeyedSaverOptions<T> {
  /** Persists one item. */
  save: (item: T) => Promise<unknown>;
  /** Debounce delay in milliseconds. */
  delay: number;
  onStatus?: (status: SaveStatus, error?: unknown) => void;
}

/**
 * Debounced saver that keeps the latest pending value per key.
 *
 * Switching between items never drops edits: every key that was scheduled is
 * saved when the timer fires or when `flush()` is called (on unmount, before
 * closing a project, before a snapshot restore, or when the window closes).
 */
export class KeyedSaver<T> {
  private pending = new Map<string | number, T>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> = Promise.resolve();
  private options: KeyedSaverOptions<T>;

  constructor(options: KeyedSaverOptions<T>) {
    this.options = options;
  }

  setOptions(options: KeyedSaverOptions<T>) {
    this.options = options;
  }

  schedule(key: string | number, item: T) {
    this.pending.set(key, item);
    this.options.onStatus?.('pending');
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.options.delay);
  }

  /** Drops a pending save, e.g. for an item that is being deleted. */
  cancel(key: string | number) {
    this.pending.delete(key);
    if (this.pending.size === 0 && this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  hasPending(): boolean {
    return this.pending.size > 0;
  }

  /** Saves everything that is pending now and waits for earlier saves too. */
  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const items = Array.from(this.pending.values());
    this.pending.clear();
    if (items.length === 0) {
      return this.inFlight;
    }

    // Chain onto the previous flush so saves of the same item stay in order.
    const run = this.inFlight.then(async () => {
      this.options.onStatus?.('saving');
      try {
        for (const item of items) {
          await this.options.save(item);
        }
        if (!this.hasPending()) this.options.onStatus?.('saved');
      } catch (err) {
        this.options.onStatus?.('error', err);
        throw err;
      }
    });
    this.inFlight = run.catch(() => undefined);
    return run;
  }
}

type Flusher = () => Promise<void>;
const flushers = new Set<Flusher>();

/** Registers a flush callback that `flushAllAutosaves` will run. */
export function registerFlusher(flusher: Flusher): () => void {
  flushers.add(flusher);
  return () => {
    flushers.delete(flusher);
  };
}

/** Writes every pending autosave in the app. Errors are reported, not thrown. */
export async function flushAllAutosaves(): Promise<void> {
  const results = await Promise.allSettled(Array.from(flushers).map((flush) => flush()));
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Autosave flush failed:', result.reason);
    }
  }
}
