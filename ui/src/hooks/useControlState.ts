import { useEffect, useState } from "react";

import { getControlState, pauseDemo, resumeDemo } from "../api/client.js";
import { subscribeToEvents } from "../api/stream.js";

export interface ControlStateHandle {
  paused: boolean;
  /** True while a pause/resume request is in flight (button disable hint). */
  pending: boolean;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
}

/**
 * Reads the demo's pause/resume state and keeps it in sync via SSE.
 *
 * On mount: GET /control/state to seed initial value (in case the user
 * loaded the page mid-pause). Then `control.changed` SSE events drive
 * updates from then on. The returned `pause`/`resume` callbacks POST the
 * matching endpoint; the SSE event from the server flips `paused` so the
 * UI is consistent across multiple browser tabs.
 */
export function useControlState(): ControlStateHandle {
  const [paused, setPaused] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getControlState()
      .then((state) => {
        if (!cancelled) setPaused(state.paused);
      })
      .catch(() => {
        /* server not reachable yet — SSE control.changed will catch us up */
      });

    const off = subscribeToEvents({
      onControlChanged: (data) => {
        const next = (data as { paused?: unknown })?.paused;
        if (typeof next === "boolean") setPaused(next);
      },
    });
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  async function pause(): Promise<void> {
    setPending(true);
    try {
      const res = await pauseDemo();
      setPaused(res.paused);
    } finally {
      setPending(false);
    }
  }

  async function resume(): Promise<void> {
    setPending(true);
    try {
      const res = await resumeDemo();
      setPaused(res.paused);
    } finally {
      setPending(false);
    }
  }

  return { paused, pending, pause, resume };
}
