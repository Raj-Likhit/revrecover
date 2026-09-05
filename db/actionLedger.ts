/**
 * db/actionLedger.ts
 * ---------------------------------------------------------------------------
 * Fixes: "Transactional DB layer — actions" gap from the comparison report.
 *
 * Implements the plan's action-level idempotency requirement (§5, §12):
 *   "Write a row with a UNIQUE(subscription_id, ladder_stage) constraint
 *    BEFORE calling the Razorpay API; on conflict, reuse the existing open
 *    link rather than minting a second one."
 *
 * This is the second idempotency layer — webhook-level dedupe (which you
 * already have) protects against duplicate *inbound* events; this protects
 * against a crash between "created link" and "logged link" causing a
 * duplicate *outbound* action.
 *
 * ADAPT:
 *  - Uses `better-sqlite3` (synchronous, one extra dependency). Swap the
 *    `Database` import if you're on a different driver — only the functions
 *    below need to change, the call sites don't.
 *  - `nowEpochSeconds()` accepts an optional clock override so it can be
 *    driven by the plan's mocked-clock demo mechanic (§17: "drive your own
 *    state machine off a mocked clock").
 */

import Database from 'better-sqlite3';
import type { ScoredCase, ActionStatus } from '../types';

export interface ActionRow {
  id: number;
  subscription_id: string;
  ladder_stage: string;
  action_type: string;
  status: ActionStatus;
  provider: string | null;
  provider_ref_id: string | null;
  hosted_url: string | null;
  idempotency_key: string;
  cost_paise: number;
  net_ev_paise: number;
  policy_version: string;
  arm: string;
  result_label: string;
  dry_run: number;
  created_at: number;
  dispatched_at: number | null;
  failure_reason: string | null;
}

export function nowEpochSeconds(clock?: () => Date): number {
  return Math.floor((clock ? clock() : new Date()).getTime() / 1000);
}

export function buildIdempotencyKey(subscriptionId: string, ladderStage: string): string {
  return `${subscriptionId}:stage_${ladderStage}`;
}

export type ReservationResult =
  | { reserved: true; row: ActionRow }
  | { reserved: false; existing: ActionRow };

/**
 * Claims the (subscription_id, ladder_stage) slot for this case BEFORE any
 * provider API call is made. Call this first, always.
 */
export function reserveAction(
  db: Database.Database,
  input: {
    case: ScoredCase;
    actionType: string;
    initialStatus?: ActionStatus; // default 'reserved'; pass 'queued' if outside quiet hours
    dryRun: boolean;
    clock?: () => Date;
  }
): ReservationResult {
  const { case: c, actionType, dryRun } = input;
  const idempotencyKey = buildIdempotencyKey(c.subscriptionId, c.ladderStage);
  const createdAt = nowEpochSeconds(input.clock);

  const insert = db.prepare(`
    INSERT INTO actions (
      subscription_id, ladder_stage, action_type, status, idempotency_key,
      cost_paise, net_ev_paise, policy_version, arm, result_label, dry_run, created_at
    ) VALUES (@subscription_id, @ladder_stage, @action_type, @status, @idempotency_key,
      @cost_paise, @net_ev_paise, @policy_version, @arm, @result_label, @dry_run, @created_at)
  `);

  try {
    const info = insert.run({
      subscription_id: c.subscriptionId,
      ladder_stage: c.ladderStage,
      action_type: actionType,
      status: input.initialStatus ?? 'reserved',
      idempotency_key: idempotencyKey,
      cost_paise: c.costPaise,
      net_ev_paise: c.netEvPaise,
      policy_version: c.policyVersion,
      arm: c.arm,
      result_label: 'simulated',
      dry_run: dryRun ? 1 : 0,
      created_at: createdAt,
    });
    const row = getActionById(db, Number(info.lastInsertRowid))!;
    return { reserved: true, row };
  } catch (err) {
    // SQLITE_CONSTRAINT_UNIQUE on (subscription_id, ladder_stage)
    const errorCode = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
    if (errorCode.startsWith('SQLITE_CONSTRAINT')) {
      const existing = getOpenAction(db, c.subscriptionId, c.ladderStage);
      if (existing) return { reserved: false, existing };
    }
    throw err;
  }
}

export function getActionById(db: Database.Database, id: number): ActionRow | undefined {
  return db.prepare(`SELECT * FROM actions WHERE id = ?`).get(id) as ActionRow | undefined;
}

export function getOpenAction(
  db: Database.Database,
  subscriptionId: string,
  ladderStage: string
): ActionRow | undefined {
  return db
    .prepare(`SELECT * FROM actions WHERE subscription_id = ? AND ladder_stage = ?`)
    .get(subscriptionId, ladderStage) as ActionRow | undefined;
}

/** Call after a successful provider call (or immediately, in dry-run mode). */
export function recordActionDispatched(
  db: Database.Database,
  actionId: number,
  result: {
    provider: string;
    providerRefId: string;
    hostedUrl?: string;
    resultLabel?: 'observed_test' | 'simulated';
  },
  clock?: () => Date
): void {
  db.prepare(`
    UPDATE actions SET status = 'dispatched', provider = @provider,
      provider_ref_id = @provider_ref_id, hosted_url = @hosted_url,
      result_label = @result_label, dispatched_at = @dispatched_at
    WHERE id = @id
  `).run({
    id: actionId,
    provider: result.provider,
    provider_ref_id: result.providerRefId,
    hosted_url: result.hostedUrl ?? null,
    result_label: result.resultLabel ?? 'simulated',
    dispatched_at: nowEpochSeconds(clock),
  });
}

export function recordActionFailed(db: Database.Database, actionId: number, reason: string): void {
  db.prepare(`UPDATE actions SET status = 'failed', failure_reason = ? WHERE id = ?`).run(reason, actionId);
}

/** Everything still sitting in 'queued' — used by the dispatch queue worker. */
export function getQueuedActions(db: Database.Database): ActionRow[] {
  return db.prepare(`SELECT * FROM actions WHERE status = 'queued' ORDER BY created_at ASC`).all() as ActionRow[];
}

/** Dispatched actions for a subscription within a lookback window — used by attribution.ts. */
export function getDispatchedActionsForSubscription(
  db: Database.Database,
  subscriptionId: string,
  sinceEpochSeconds: number
): ActionRow[] {
  return db
    .prepare(`
      SELECT * FROM actions
      WHERE subscription_id = ? AND status = 'dispatched' AND dispatched_at >= ?
      ORDER BY dispatched_at DESC
    `)
    .all(subscriptionId, sinceEpochSeconds) as ActionRow[];
}
