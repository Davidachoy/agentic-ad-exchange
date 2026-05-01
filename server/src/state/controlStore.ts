/**
 * In-memory pause/resume flag for the demo. Subscribers are notified only
 * when the flag actually changes — repeated `setPaused(true)` calls collapse
 * into a single `control.changed` SSE event so the UI doesn't churn.
 */
export interface ControlStore {
  isPaused(): boolean;
  setPaused(paused: boolean): void;
  /** Returns an unsubscribe function. */
  subscribe(listener: (paused: boolean) => void): () => void;
}

export function createControlStore(initial = false): ControlStore {
  let paused = initial;
  const listeners = new Set<(paused: boolean) => void>();

  return {
    isPaused() {
      return paused;
    },
    setPaused(next) {
      if (next === paused) return;
      paused = next;
      for (const fn of listeners) fn(paused);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
