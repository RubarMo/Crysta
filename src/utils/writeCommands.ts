/**
 * Commands that target the Write tab (Zen mode, reference drawer) but can be
 * triggered from elsewhere, like the command palette. If the Write tab isn't
 * mounted yet, the command waits until it is.
 */
export type WriteCommand = 'toggle-zen' | 'toggle-reference';

type Listener = (command: WriteCommand) => void;

let listener: Listener | null = null;
let pending: WriteCommand | null = null;

export function sendWriteCommand(command: WriteCommand) {
  if (listener) {
    listener(command);
  } else {
    pending = command;
  }
}

/** Called by the Write tab; delivers any command sent before it mounted. */
export function listenForWriteCommands(fn: Listener): () => void {
  listener = fn;
  if (pending) {
    const command = pending;
    pending = null;
    fn(command);
  }
  return () => {
    if (listener === fn) listener = null;
  };
}
