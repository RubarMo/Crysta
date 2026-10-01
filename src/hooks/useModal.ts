import { RefObject, useEffect, useLayoutEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Open dialogs, innermost last. Only the top one reacts to Escape and Tab.
const dialogStack: symbol[] = [];

/**
 * Dialog behaviour for an overlay: Escape closes it (only the topmost one
 * when dialogs are stacked), Tab stays inside it, focus moves into it on open
 * and returns to the previously focused element on close.
 */
export function useModal(
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: { autoFocus?: boolean } = {}
) {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });
  const autoFocus = options.autoFocus ?? true;

  useEffect(() => {
    const id = Symbol('dialog');
    dialogStack.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (container && autoFocus && !container.contains(document.activeElement)) {
      // Prefer the first form field, so typing can start right away.
      const field = container.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled]), select:not([disabled])'
      );
      const first = field ?? container.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? container).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== id) return;
      const el = containerRef.current;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && el) {
        const focusables = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (node) => node.offsetParent !== null || node === document.activeElement
        );
        if (focusables.length === 0) {
          e.preventDefault();
          el.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !el.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !el.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      const index = dialogStack.indexOf(id);
      if (index !== -1) dialogStack.splice(index, 1);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
    // Runs once per open dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** True while any dialog opened with `useModal` is on screen. */
export function isAnyDialogOpen(): boolean {
  return dialogStack.length > 0;
}
