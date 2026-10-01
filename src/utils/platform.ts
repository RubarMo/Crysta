/** True on phones and tablets, where native file dialogs aren't available. */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** True when running inside the Tauri webview (not a plain browser). */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Error code returned by native commands that don't work on mobile yet. */
export const UNSUPPORTED_ON_MOBILE = 'UNSUPPORTED_ON_MOBILE';

export function isUnsupportedOnMobile(err: unknown): boolean {
  return String(err).includes(UNSUPPORTED_ON_MOBILE);
}
