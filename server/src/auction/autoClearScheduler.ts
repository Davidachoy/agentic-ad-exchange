import type { Logger } from "pino";

import type { RunAuctionOutcome } from "./runAuction.js";

export interface AutoClearSchedulerDeps {
  /**
   * Milliseconds between `listingStore.add()` and the auto-clear fire.
   * 0 (or negative) disables the scheduler — `schedule()` becomes a no-op.
   */
  delayMs: number;
  /** Injected runAuction binding so the scheduler stays unit-testable. */
  runAuction: (listingId: string) => Promise<RunAuctionOutcome>;
  logger: Logger;
  /**
   * Pause predicate. When it returns true at fire-time, the scheduler skips
   * the runAuction call (logs at debug). Defaults to "never paused".
   */
  isPaused?: () => boolean;
}

export interface AutoClearScheduler {
  /** Idempotent: clears any prior timer for this id, then queues a fresh one. */
  schedule(listingId: string): void;
  /** Cancel a pending timer. Safe if no timer is pending for this id. */
  cancel(listingId: string): void;
  /** Test/server-stop hook: clears every pending timer. */
  shutdown(): void;
  /** Test introspection. */
  pendingCount(): number;
}

export function createAutoClearScheduler(deps: AutoClearSchedulerDeps): AutoClearScheduler {
  const timers = new Map<string, NodeJS.Timeout>();

  function schedule(listingId: string): void {
    if (deps.delayMs <= 0) return;
    const prev = timers.get(listingId);
    if (prev) clearTimeout(prev);

    const handle = setTimeout(() => {
      // Reason: setTimeout cannot await an async callback, so we wrap in IIFE
      // and catch every rejection. A background-task uncaught rejection would
      // crash the process under Node's --unhandled-rejections=throw default.
      void (async () => {
        try {
          if (deps.isPaused?.()) {
            deps.logger.debug({ listingId }, "auto_clear_skipped_paused");
            return;
          }
          const outcome = await deps.runAuction(listingId);
          switch (outcome.kind) {
            case "listing_not_found":
              deps.logger.debug({ listingId }, "auto_clear_skipped_listing_gone");
              break;
            case "no_eligible_bids":
              deps.logger.info({ listingId }, "auto_clear_skipped_no_eligible_bids");
              break;
            case "settled":
              deps.logger.info(
                {
                  listingId,
                  clearingPriceUsdc: outcome.auctionResult.clearingPriceUsdc,
                  status: outcome.receipt.status,
                },
                "auto_clear_settled",
              );
              break;
          }
        } catch (err) {
          deps.logger.error({ err, listingId }, "auto_clear_failed");
        } finally {
          timers.delete(listingId);
        }
      })();
    }, deps.delayMs);

    // Reason: don't keep the event loop alive just for a stray scheduled timer
    // (e.g. a leaked test instance). Express's listener keeps the loop alive
    // in production regardless.
    handle.unref?.();

    timers.set(listingId, handle);
  }

  function cancel(listingId: string): void {
    const handle = timers.get(listingId);
    if (!handle) return;
    clearTimeout(handle);
    timers.delete(listingId);
  }

  function shutdown(): void {
    for (const handle of timers.values()) clearTimeout(handle);
    timers.clear();
  }

  function pendingCount(): number {
    return timers.size;
  }

  return { schedule, cancel, shutdown, pendingCount };
}
