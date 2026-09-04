/**
 * db/attribution.ts
 * ---------------------------------------------------------------------------
 * Fixes: "Transactional DB layer — attribution" gap. Implements the plan's
 * four-outcome verification step (§5):
 *
 *   direct     — payment captured through the agent-created link/card-update
 *   assisted   — captured after an agent contact, but via another route,
 *                within a defined attribution window (plan uses 72h as its example)
 *   organic    — subscription.charged with no preceding agent action
 *                (or during wait_for_autopay) — NOT a loss, report as
 *                correct restraint
 *   unattributed — window closed, no capture, or evidence insufficient
 *
 * Call `correlatePaymentEvent` from your `payment.captured` /
 * `subscription.charged` webhook handlers, after your existing dedupe check.
 *
 * ADAPT: `ATTRIBUTION_WINDOW_SECONDS` and the direct-vs-assisted matching
 * rule (currently: same provider_ref_id in the event payload = direct, any
 * other dispatched action in-window = assisted) should be checked against
 * whatever field your webhook payload actually carries for this (e.g.
 * Razorpay's payment_link_id on the payment.captured payload) before relying
 * on it.
 */

import Database from 'better-sqlite3';
import { getDispatchedActionsForSubscription, nowEpochSeconds } from './actionLedger';
import type { AttributionOutcome } from '../types';

export const ATTRIBUTION_WINDOW_SECONDS = 72 * 60 * 60; // 72h, per plan §5

export interface PaymentEvent {
  subscriptionId: string;
  paymentId?: string;
  eventType: 'payment.captured' | 'subscription.charged';
  amountPaise: number;
  paymentRoute?: string; // e.g. Razorpay payment_link_id, or 'autopay'
  occurredAt?: number; // epoch seconds; defaults to now
}

export function correlatePaymentEvent(
  db: Database.Database,
  event: PaymentEvent,
  clock?: () => Date
): { outcome: AttributionOutcome; matchedActionId: number | null } {
  const occurredAt = event.occurredAt ?? nowEpochSeconds(clock);
  const windowStart = occurredAt - ATTRIBUTION_WINDOW_SECONDS;

  const recentActions = getDispatchedActionsForSubscription(db, event.subscriptionId, windowStart);

  let outcome: AttributionOutcome = 'unattributed';
  let matchedActionId: number | null = null;

  if (recentActions.length === 0) {
    // No agent action in window: the plan treats "no preceding agent
    // action" as organic (subscription.charged via autopay, or a capture
    // during wait_for_autopay) rather than an evidence gap.
    outcome = 'organic';
  } else {
    const directMatch = event.paymentRoute
      ? recentActions.find((a) => a.provider_ref_id === event.paymentRoute)
      : undefined;

    if (directMatch) {
      outcome = 'direct';
      matchedActionId = directMatch.id;
    } else {
      // An agent action exists in-window but this capture came through a
      // different route (e.g. customer paid manually after the reminder,
      // not via the link itself).
      outcome = 'assisted';
      matchedActionId = recentActions[0].id;
    }
  }

  db.prepare(`
    INSERT INTO attribution_events (
      subscription_id, payment_id, event_type, amount_paise, payment_route,
      occurred_at, matched_action_id, outcome, matched_within_secs
    ) VALUES (@subscription_id, @payment_id, @event_type, @amount_paise, @payment_route,
      @occurred_at, @matched_action_id, @outcome, @matched_within_secs)
  `).run({
    subscription_id: event.subscriptionId,
    payment_id: event.paymentId ?? null,
    event_type: event.eventType,
    amount_paise: event.amountPaise,
    payment_route: event.paymentRoute ?? null,
    occurred_at: occurredAt,
    matched_action_id: matchedActionId,
    outcome,
    matched_within_secs: matchedActionId ? occurredAt - windowStart : null,
  });

  return { outcome, matchedActionId };
}

/** Aggregate split for the results dashboard (§15: direct/assisted/organic/unattributed). */
export function getAttributionSplit(
  db: Database.Database,
  sinceEpochSeconds?: number
): Record<AttributionOutcome, number> {
  const rows = db
    .prepare(
      sinceEpochSeconds
        ? `SELECT outcome, COUNT(*) as n FROM attribution_events WHERE occurred_at >= ? GROUP BY outcome`
        : `SELECT outcome, COUNT(*) as n FROM attribution_events GROUP BY outcome`
    )
    .all(...(sinceEpochSeconds ? [sinceEpochSeconds] : [])) as { outcome: AttributionOutcome; n: number }[];

  const result: Record<AttributionOutcome, number> = { direct: 0, assisted: 0, organic: 0, unattributed: 0 };
  for (const r of rows) result[r.outcome] = r.n;
  return result;
}
