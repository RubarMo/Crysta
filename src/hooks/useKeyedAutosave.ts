import { useEffect, useLayoutEffect, useState } from 'react';
import { KeyedSaver, KeyedSaverOptions, registerFlusher } from '../utils/autosave';

/**
 * React wrapper around `KeyedSaver`. The saver lives for the component's
 * lifetime, always uses the latest callbacks, flushes on unmount, and is
 * flushed by `flushAllAutosaves()` (e.g. before the window closes).
 */
export function useKeyedAutosave<T>(options: KeyedSaverOptions<T>): KeyedSaver<T> {
  const [saver] = useState(() => new KeyedSaver(options));

  useLayoutEffect(() => {
    saver.setOptions(options);
  });

  useEffect(() => {
    const unregister = registerFlusher(() => saver.flush());
    return () => {
      unregister();
      void saver.flush().catch((err) => console.error('Autosave on unmount failed:', err));
    };
  }, [saver]);

  return saver;
}
