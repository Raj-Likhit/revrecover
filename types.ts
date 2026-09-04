/**
 * types.ts
 * ---------------------------------------------------------------------------
 * Shared types for the RevRecover hardening modules (Razorpay execution,
 * action ledger, attribution, budget allocation, dispatch queue).
 *
 * ADAPT: you almost certainly already have equivalents of some of these
 * (Case, LadderStage, ReasonBucket, PolicyDecision) in your existing engine.
 * Delete the duplicates here and import your real ones instead — the shapes
 * below match the audit-log schema in the master plan (§10), so it should be
 * a rename, not a rewrite.
 */

export type LadderStage =
  | 'pending_scored'
  | 'pending_reminder'
  | 'halted_immediate'
  | 'halted_plus_3'
  | 'halted_plus_7_grace'
  | 'halted_plus_14_handoff';

export type ReasonBucket =
  | 'insufficient_funds'
  | 'technical_decline'
  | 'afa_incomplete'
  | 'mandate_expired'
  | 'unknown_decline';

export type PolicyDecision =
  | 'wait_for_autopay'
  | 'send_reminder'
  | 'send_payment_link'
  | 'send_card_update_link'
  | 'offer_grace_period'
  | 'escalate_to_human'
  | 'stop';

export type Arm = 'treatment' | 'control';
export type ResultLabel = 'observed_test' | 'simulated' | 'inferred';

export type ActionStatus = 'reserved' | 'queued' | 'dispatched' | 'failed';

export type AttributionOutcome = 'direct' | 'assisted' | 'organic' | 'unattributed';

/**
 * Minimal shape of a scored, policy-decided case, as it exists right before
 * action execution. ADAPT: map this from your real Case/RecoveryCase type —
 * field names here mirror the plan's §10 audit-log JSON example.
 */
export interface ScoredCase {
  subscriptionId: string;
  customerId: string;
  ladderStage: LadderStage;
  reasonBucket: ReasonBucket;
  decision: PolicyDecision;
  amountPaise: number;
  pBase: number;
  pTreated: number;
  liftUsed: number;
  expectedLiftValuePaise: number;
  costPaise: number;
  netEvPaise: number;
  policyVersion: string;
  arm: Arm;
  costGuardrailPassed: boolean;
}
