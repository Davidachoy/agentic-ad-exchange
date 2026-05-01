import { describe, expect, it, vi } from "vitest";

import { createControlStore } from "./controlStore.js";

describe("createControlStore", () => {
  it("starts un-paused (happy)", () => {
    const store = createControlStore();
    expect(store.isPaused()).toBe(false);
  });

  it("toggles state and notifies subscribers (edge)", () => {
    const store = createControlStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setPaused(true);
    store.setPaused(false);

    expect(store.isPaused()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, true);
    expect(listener).toHaveBeenNthCalledWith(2, false);
  });

  it("does not fire listeners when state is unchanged (edge)", () => {
    const store = createControlStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setPaused(false); // no change from initial false
    store.setPaused(true);
    store.setPaused(true); // no change from previous true

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(true);
  });

  it("unsubscribe removes the listener (failure case = stale subscriber)", () => {
    const store = createControlStore();
    const listener = vi.fn();
    const off = store.subscribe(listener);

    off();
    store.setPaused(true);

    expect(listener).not.toHaveBeenCalled();
  });
});
