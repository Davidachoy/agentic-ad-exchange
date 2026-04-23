import "@testing-library/jest-dom/vitest";

// Polyfill EventSource in jsdom so useAuctionStream's subscribe doesn't throw.
class FakeEventSource {
  public readyState = 1;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_url: string) {}
  addEventListener(): void {
    /* noop */
  }
  close(): void {
    /* noop */
  }
  // Required surface properties
  onerror: ((this: EventSource, ev: Event) => unknown) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent) => unknown) | null = null;
  onopen: ((this: EventSource, ev: Event) => unknown) | null = null;
}
// Reason: jsdom (as of v24) ships no EventSource; components exercising SSE
// would otherwise throw ReferenceError in unit tests.
(globalThis as unknown as { EventSource: typeof FakeEventSource }).EventSource = FakeEventSource;
