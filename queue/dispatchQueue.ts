/**
 * queue/dispatchQueue.ts
 * ---------------------------------------------------------------------------
 * Fixes: "Quiet-hour actions are labelled queued but there is no
 * scheduler/worker to dispatch them once the permitted window starts."
 *
 * A deliberately boring worker (plan §3: "keep the machinery boring" — no
 * message broker, just a state column and a scheduled loop). Reserve
 * actions decided outside 09:00–20:00 IST with status='queued' via
 * actionLedger.reserveAction(...), then start this worker once at process
 * boot; it polls and dispatches them the moment the window opens.
 *
 * ADAPT:
 *  - `dispatchFn` is injected so this file has no direct dependency on your
 *    LLM/messaging layer or on razorpayProvider — wire your real dispatch
 *    logic (draft message → call provider → send) in the callback.
 *  - `isKillSwitchActive` / `isDryRunActive` — wire to your existing global
 *    flags (plan §12 calls for a single flag for each).
 */

import Database from 'better-sqlite3';
import { getQueuedActions, recordActionDispatched, recordActionFailed, type ActionRow } from '../db/actionLedger';

const IST_OFFSET_MINUTES = 5 * 60 + 30;

export function isWithinQuietHoursIST(date: Date = new Date()): boolean {
  const istMs = date.getTime() + IST_OFFSET_MINUTES * 60 * 1000;
  const istDate = new Date(istMs);
  const hour = istDate.getUTCHours();
  return hour >= 9 && hour < 20; // 09:00–20:00 IST, per plan §6
}

export interface DispatchQueueOptions {
  db: Database.Database;
  pollIntervalMs?: number; // default 60s
  isKillSwitchActive: () => boolean;
  isDryRunActive: () => boolean;
  dispatchFn: (row: ActionRow) => Promise<{ provider: string; providerRefId: string; hostedUrl?: string }>;
  clock?: () => Date;
  onError?: (row: ActionRow, err: unknown) => void;
}

export interface DispatchQueueHandle {
  stop: () => void;
  tick: () => Promise<void>; // exposed directly for tests — no need to wait on the interval
}

export function startDispatchQueue(opts: DispatchQueueOptions): DispatchQueueHandle {
  const pollIntervalMs = opts.pollIntervalMs ?? 60_000;

  async function tick(): Promise<void> {
    if (opts.isKillSwitchActive()) return; // plan §12: kill switch stops ALL outbound actions
    const now = opts.clock ? opts.clock() : new Date();
    if (!isWithinQuietHoursIST(now)) return;

    const queued = getQueuedActions(opts.db);
    for (const row of queued) {
      try {
        if (opts.isDryRunActive()) {
          recordActionDispatched(opts.db, row.id, { provider: 'dry_run', providerRefId: `dry_run:${row.id}` }, opts.clock);
          continue;
        }
        const result = await opts.dispatchFn(row);
        recordActionDispatched(
          opts.db,
          row.id,
          {
            provider: result.provider,
            providerRefId: result.providerRefId,
            hostedUrl: result.hostedUrl,
            resultLabel: 'observed_test',
          },
          opts.clock
        );
      } catch (err) {
        recordActionFailed(opts.db, row.id, err instanceof Error ? err.message : 'dispatch failed');
        opts.onError?.(row, err);
      }
    }
  }

  const interval = setInterval(() => {
    tick().catch((err) => console.error('[dispatchQueue] tick failed', err));
  }, pollIntervalMs);

  return { stop: () => clearInterval(interval), tick };
}
