import {
  ReasonBucket,
  ArmType,
  ResultLabel,
  SubscriptionStatus,
  LadderStage,
  PolicyDecision,
  AttributionOutcome,
  BenchmarkProbability,
  ComplianceChecks,
  AuditLogEntry,
  SubscriptionCase,
  EngineStats,
  TelemetryStep,
} from '../src/types/revrecover.js';
import { draftHinglishMessage } from './gemini.js';
import { RecoveryStore, openOperationalDatabase } from './store.js';
import { computeDecisionTimeCostPaise, computeSettlementCostPaise } from '../policy/costStack.js';
import { reserveAction, recordActionDispatched, recordActionFailed } from '../db/actionLedger.js';
import { correlatePaymentEvent } from '../db/attribution.js';
import { createPaymentLink, getCardUpdateCheckoutUrl } from '../providers/razorpayProvider.js';
import type { ScoredCase } from '../types.js';

export const operationalDb = openOperationalDatabase();

// Benchmark Paired Probabilities Matrix (Derived from §9 Real-world Indian SaaS & Payment Benchmarks)
export const BENCHMARK_MATRIX: Record<ReasonBucket, BenchmarkProbability> = {
  insufficient_funds: {
    reason_bucket: 'insufficient_funds',
    p_base: 0.45,
    p_treated: 0.62,
    lift: 0.17,
    description: 'Soft decline; ~44% of all recurring failures; high organic resolution via daily retries',
    basis: 'High baseline resolution via Razorpay T+3 daily retries; agent intervention adds moderate lift.',
  },
  technical_decline: {
    reason_bucket: 'technical_decline',
    p_base: 0.50,
    p_treated: 0.65,
    lift: 0.15,
    description: 'Soft gateway/bank timeout; card valid; transient network failure',
    basis: 'High organic recovery when bank network stabilizes; messaging during T+0/T+1 usually unnecessary.',
  },
  afa_required: {
    reason_bucket: 'afa_required',
    p_base: 0.15,
    p_treated: 0.45,
    lift: 0.30,
    description: 'Amount > ₹15,000 or bank mandated OTP challenge; autopay cannot complete alone',
    basis: 'Autopay is blocked without customer OTP input; customer action link yields high incremental lift.',
  },
  mandate_expired: {
    reason_bucket: 'mandate_expired',
    p_base: 0.05,
    p_treated: 0.30,
    lift: 0.25,
    description: 'Card expired or mandate token cancelled; autopay will NEVER succeed',
    basis: 'Organic recovery is near-zero; 100% of recovery is agent-attributable; saves ongoing MRR.',
  },
  unknown_decline: {
    reason_bucket: 'unknown_decline',
    p_base: 0.30,
    p_treated: 0.42,
    lift: 0.12,
    description: 'Generic issuer decline code; wide prior; flagged low-confidence',
    basis: 'Uncertain decline code; routed to human review earlier with lower confidence.',
  },
};

// Global Engine State
export class RecoveryEngine {
  public killSwitchActive: boolean = false;
  public dryRunActive: boolean = false;
  public mockedClockTime: number; // Unix timestamp in seconds
  public processedWebhooks = new Set<string>(); // Layer 1 Idempotency
  public executedActionKeys = new Set<string>(); // Layer 2 Idempotency: `subId:stage`
  public cases = new Map<string, SubscriptionCase>();
  public auditLogs: AuditLogEntry[] = [];
  public suppressionList = new Set<string>(); // Phone/Emails that opted out
  public dailyContactCapacity = 80;
  private store?: RecoveryStore;

  constructor(options: { persist?: boolean } = {}) {
    // Current default timestamp: 2026-08-28 11:30:00 IST (06:00:00 UTC) -> inside quiet hours
    this.mockedClockTime = Math.floor(new Date('2026-08-28T06:00:00Z').getTime() / 1000);
    if (options.persist) {
      this.store = new RecoveryStore();
      this.restore();
    }
  }

  private restore(): void {
    const state = this.store?.load();
    if (!state) return;
    this.killSwitchActive = state.killSwitchActive;
    this.dryRunActive = state.dryRunActive;
    this.mockedClockTime = state.mockedClockTime;
    this.processedWebhooks = new Set(state.processedWebhooks);
    this.executedActionKeys = new Set(state.executedActionKeys);
    this.suppressionList = new Set(state.suppressionList);
    this.cases = new Map((state.cases as SubscriptionCase[]).map(item => [item.subscription_id, item]));
    this.auditLogs = state.auditLogs as AuditLogEntry[];
  }

  public persist(): void {
    this.store?.save({
      killSwitchActive: this.killSwitchActive, dryRunActive: this.dryRunActive, mockedClockTime: this.mockedClockTime,
      processedWebhooks: [...this.processedWebhooks], executedActionKeys: [...this.executedActionKeys], suppressionList: [...this.suppressionList],
      cases: [...this.cases.values()], auditLogs: this.auditLogs,
    });
  }

  public reset(seedTime?: number) {
    this.processedWebhooks.clear();
    this.executedActionKeys.clear();
    this.cases.clear();
    this.auditLogs = [];
    this.suppressionList.clear();
    this.mockedClockTime = seedTime || Math.floor(new Date('2026-08-28T06:00:00Z').getTime() / 1000);
    this.persist();
  }

  // Diagnostic Classifier: Pure deterministic mapping from Razorpay error parameters
  public diagnoseFailure(params: {
    errorCode?: string;
    errorDescription?: string;
    errorSource?: 'customer' | 'business' | 'gateway' | 'issuer';
    errorStep?: string;
    errorReason?: string;
    amountPaise: number;
  }): { reasonBucket: ReasonBucket; confidence: 'high' | 'medium' | 'low'; description: string } {
    const { errorReason, errorSource, amountPaise } = params;
    const reasonLower = (errorReason || '').toLowerCase();
    const sourceLower = (errorSource || '').toLowerCase();

    if (
      reasonLower.includes('insufficient_funds') ||
      reasonLower.includes('balance') ||
      reasonLower.includes('exceeds_balance')
    ) {
      return {
        reasonBucket: 'insufficient_funds',
        confidence: 'high',
        description: 'Insufficient funds on customer account (Soft decline)',
      };
    }

    if (
      reasonLower.includes('expired') ||
      reasonLower.includes('card_expired') ||
      reasonLower.includes('debit_instrument_blocked') ||
      reasonLower.includes('token_deleted') ||
      reasonLower.includes('mandate_cancelled')
    ) {
      return {
        reasonBucket: 'mandate_expired',
        confidence: 'high',
        description: 'Card mandate expired or token invalidated (Hard decline — requires card update)',
      };
    }

    if (
      reasonLower.includes('afa') ||
      reasonLower.includes('otp') ||
      reasonLower.includes('authentication_required') ||
      amountPaise > 1500000 // > ₹15,000 threshold
    ) {
      return {
        reasonBucket: 'afa_required',
        confidence: 'high',
        description: 'Additional Factor Authentication required per RBI 2026 guidelines',
      };
    }

    if (
      sourceLower === 'gateway' ||
      sourceLower === 'issuer' && (reasonLower.includes('bank_not_available') || reasonLower.includes('timeout') || reasonLower.includes('system_error'))
    ) {
      return {
        reasonBucket: 'technical_decline',
        confidence: 'high',
        description: 'Transient bank or gateway network timeout (Soft decline)',
      };
    }

    if (reasonLower.includes('card_declined') || reasonLower.includes('do_not_honor')) {
      return {
        reasonBucket: 'unknown_decline',
        confidence: 'low',
        description: 'Generic bank decline without specific subcode; wide prior',
      };
    }

    return {
      reasonBucket: 'unknown_decline',
      confidence: 'low',
      description: 'Unclassified error reason; fallback to generic bucket',
    };
  }

  // Check if current mocked clock is inside 09:00 - 20:00 IST quiet hours
  public isInsideQuietHours(epochSeconds: number): boolean {
    const date = new Date(epochSeconds * 1000);
    // Convert to IST (UTC + 5:30)
    const istOffsetHours = 5.5;
    const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
    let istHours = utcHours + istOffsetHours;
    if (istHours >= 24) istHours -= 24;

    return istHours >= 9.0 && istHours < 20.0;
  }

  public isOutboundDecision(decision: PolicyDecision): boolean {
    return ['send_payment_link', 'send_card_update_link', 'send_reminder', 'offer_grace_period'].includes(decision);
  }

  private contactsInWindow(customerPhone: string, now: number): number {
    const windowStart = now - 30 * 86400;
    return this.auditLogs.filter(log => log.customer_phone_masked === customerPhone && log.timestamp >= windowStart &&
      ['simulated_hosted_card_change_checkout', 'simulated_payment_link', 'razorpay_hosted_card_change_checkout', 'razorpay_payment_link'].includes(log.execution_channel)).length;
  }

  private contactsToday(now: number): number {
    const dayStart = now - (now % 86400);
    return this.auditLogs.filter(log => log.timestamp >= dayStart &&
      ['simulated_hosted_card_change_checkout', 'simulated_payment_link', 'razorpay_hosted_card_change_checkout', 'razorpay_payment_link'].includes(log.execution_channel)).length;
  }

  public async advanceClock(hours: number): Promise<void> {
    this.mockedClockTime += hours * 3600;
    const now = this.mockedClockTime;
    for (const subCase of Array.from(this.cases.values())) {
      if (subCase.invoice_paid || subCase.outcome === 'stopped') continue;
      if (subCase.status === 'pending' && now - subCase.charge_at >= 3 * 86400) {
        await this.processWebhook({
          event_id: `evt_scheduler_halted_${subCase.subscription_id}_${now}`,
          event_type: 'subscription.halted', subscription_id: subCase.subscription_id,
          customer_name: subCase.customer_name, customer_phone_masked: subCase.customer_phone_masked,
          customer_email_masked: subCase.customer_email_masked, plan_name: subCase.plan_name,
          amount_paise: subCase.amount_paise, arm: subCase.arm, result_label: 'simulated', timestamp: now,
        });
        continue;
      }
      if (subCase.status !== 'halted' || !subCase.halted_at) continue;
      const haltedAge = now - subCase.halted_at;
      const scheduledStage = haltedAge >= 14 * 86400 ? 'stage_halted_plus14'
        : haltedAge >= 7 * 86400 ? 'stage_halted_plus7'
        : haltedAge >= 3 * 86400 ? 'stage_halted_plus3' : undefined;
      if (scheduledStage && subCase.current_stage !== scheduledStage) {
        await this.processWebhook({
          event_id: `evt_scheduler_${scheduledStage}_${subCase.subscription_id}_${now}`,
          event_type: 'subscription.halted', subscription_id: subCase.subscription_id,
          customer_name: subCase.customer_name, customer_phone_masked: subCase.customer_phone_masked,
          customer_email_masked: subCase.customer_email_masked, plan_name: subCase.plan_name,
          amount_paise: subCase.amount_paise, arm: subCase.arm, result_label: 'simulated', timestamp: now,
          forced_stage: scheduledStage,
        });
      }
    }
  }

  // Lift Calculation & Net EV
  public computeLiftAndNetEv(
    reasonBucket: ReasonBucket,
    amountPaise: number,
    costPaise: number
  ): {
    p_base: number;
    p_treated: number;
    lift: number;
    expectedLiftValuePaise: number;
    interventionCostPaise: number;
    netEvPaise: number;
  } {
    const benchmark = BENCHMARK_MATRIX[reasonBucket];
    const p_base = benchmark.p_base;
    const p_treated = benchmark.p_treated;
    const lift = benchmark.lift;
    const expectedLiftValuePaise = Math.round(amountPaise * lift);
    const netEvPaise = expectedLiftValuePaise - costPaise;

    return {
      p_base,
      p_treated,
      lift,
      expectedLiftValuePaise,
      interventionCostPaise: costPaise,
      netEvPaise,
    };
  }

  // Policy Decision Engine: Anchored to subscription state & lift
  public evaluatePolicy(params: {
    subCase: SubscriptionCase;
    reasonBucket: ReasonBucket;
    stage: LadderStage;
    amountPaise: number;
    arm: ArmType;
    estimatedCostPaise: number;
  }): {
    decision: PolicyDecision;
    rationaleCode: string;
    rationaleExplanation: string;
    needsHumanApproval: boolean;
    compliance: ComplianceChecks;
  } {
    const { subCase, reasonBucket, stage, amountPaise, arm, estimatedCostPaise } = params;
    const isAfaThresholdCrossed = amountPaise > 1500000; // > ₹15,000
    const isCardUpdate = reasonBucket === 'mandate_expired';
    const quietHoursOk = this.isInsideQuietHours(this.mockedClockTime);
    const isSuppressed = this.suppressionList.has(subCase.customer_phone_masked);
    const customerContacts = this.contactsInWindow(subCase.customer_phone_masked, this.mockedClockTime);
    const annoyancePassed = customerContacts < 4;
    const brokenPromiseBlocked = subCase.broken_promises_count >= 2;

    const compliance: ComplianceChecks = {
      afa_required: isAfaThresholdCrossed || isCardUpdate,
      afa_basis: isCardUpdate
        ? 'Mandate modification — always requires AFA per RBI 2026'
        : isAfaThresholdCrossed
        ? 'Transaction exceeds ₹15,000 non-AFA threshold'
        : 'Exempt (< ₹15,000 standard recurring charge)',
      quiet_hours_ok: quietHoursOk,
      suppression_list_checked_at_send: !isSuppressed,
      annoyance_cap_passed: annoyancePassed,
      message_class: 'service',
      llm_payload_pii: 'none — tokenized (name + band only)',
      dlt_template_id: 'DLT_SERV_RECOVER_V2',
    };

    // Kill switch or dry run check
    if (this.killSwitchActive) {
      return {
        decision: 'stop',
        rationaleCode: 'GLOBAL_KILL_SWITCH_ENGAGED',
        rationaleExplanation: 'Engine stopped by global safety kill switch.',
        needsHumanApproval: false,
        compliance,
      };
    }

    // Customer opt-out check
    if (isSuppressed) {
      return {
        decision: 'stop',
        rationaleCode: 'CUSTOMER_OPT_OUT_SUPPRESSED',
        rationaleExplanation: 'Customer has opted out; outbound contact strictly prohibited under TCCCPR.',
        needsHumanApproval: false,
        compliance,
      };
    }

    // Broken promise hard stop
    if (brokenPromiseBlocked) {
      return {
        decision: 'stop',
        rationaleCode: 'DOUBLE_BROKEN_PROMISE_HARD_STOP',
        rationaleExplanation: 'Customer opened link twice without settling; escalation stopped to avoid annoyance.',
        needsHumanApproval: false,
        compliance,
      };
    }

    // Annoyance cap check (TRAI 5-complaint risk mitigation)
    if (!annoyancePassed) {
      return {
        decision: 'stop',
        rationaleCode: 'ANNOYANCE_CAP_REACHED',
        rationaleExplanation: 'Maximum 4 outbound contacts in 30-day window reached.',
        needsHumanApproval: false,
        compliance,
      };
    }

    if (this.contactsToday(this.mockedClockTime) >= this.dailyContactCapacity) {
      return {
        decision: 'stop', rationaleCode: 'DAILY_CONTACT_CAPACITY_REACHED',
        rationaleExplanation: 'Daily outbound capacity is allocated; this case remains in the next policy run.', needsHumanApproval: false, compliance,
      };
    }

    // Cost guardrail check (intervention cost > 5% of value)
    const costCapPaise = Math.round(amountPaise * 0.05);
    if (estimatedCostPaise > costCapPaise) {
      return {
        decision: 'stop',
        rationaleCode: 'COST_GUARDRAIL_UNVIABLE',
        rationaleExplanation: 'Intervention cost exceeds 5% economic viability ceiling.',
        needsHumanApproval: false,
        compliance,
      };
    }

    // Control Arm: strictly zero intervention to measure true organic counterfactual
    if (arm === 'control') {
      return {
        decision: 'wait_for_autopay',
        rationaleCode: 'CONTROL_ARM_HOLDOUT',
        rationaleExplanation: 'Assigned to 20% holdout control arm to measure true counterfactual baseline.',
        needsHumanApproval: false,
        compliance,
      };
    }

    // =========================================================================
    // CORE THESIS: LEAD WITH RESTRAINT
    // While subscription is still in `pending` retries (T=0, T+1, T+2):
    // Soft declines (insufficient_funds, technical_decline) resolve naturally for free.
    // Chasing them now yields low lift and wastes customer goodwill.
    // =========================================================================
    if (stage === 'stage_0_pending' || stage === 'stage_t1_pending' || stage === 'stage_t2_pending') {
      if (reasonBucket === 'insufficient_funds' || reasonBucket === 'technical_decline') {
        return {
          decision: 'wait_for_autopay',
          rationaleCode: 'RESTRAINT_SOFT_DECLINE_WAIT_FOR_AUTOPAY',
          rationaleExplanation: `Soft decline (${reasonBucket}). Razorpay daily retry active. Expected lift is low (0.15-0.17) vs free organic recovery. Deliberately withholding outbound contact.`,
          needsHumanApproval: false,
          compliance,
        };
      }

      if (reasonBucket === 'mandate_expired') {
        // Hard decline: Autopay will NEVER recover this. Act immediately!
        return {
          decision: 'send_card_update_link',
          rationaleCode: 'HARD_DECLINE_MANDATE_EXPIRED_IMMEDIATE_ACTION',
          rationaleExplanation: 'Card mandate expired/token invalidated. Autopay cannot resolve this. Initiating immediate card update link to restore recurring mandate.',
          needsHumanApproval: false,
          compliance,
        };
      }

      if (reasonBucket === 'afa_required') {
        return {
          decision: 'send_payment_link',
          rationaleCode: 'AFA_REQUIRED_AUTHENTICATION_LINK',
          rationaleExplanation: 'Payment requires active OTP/AFA verification. Autopay retries will fail without user intervention. Sending authenticated payment link.',
          needsHumanApproval: false,
          compliance,
        };
      }

      if (reasonBucket === 'unknown_decline') {
        return {
          decision: 'escalate_to_human',
          rationaleCode: 'UNKNOWN_DECLINE_EARLY_REVIEW',
          rationaleExplanation: 'Ambiguous issuer decline code with low confidence prior. Recommending human review.',
          needsHumanApproval: true,
          compliance,
        };
      }
    }

    // When Razorpay platform gives up and subscription moves to `halted` (~Day 3)
    if (stage === 'stage_halted_0') {
      if (reasonBucket === 'mandate_expired') {
        return {
          decision: 'send_card_update_link',
          rationaleCode: 'HALTED_MANDATE_CARD_UPDATE',
          rationaleExplanation: 'Subscription halted due to expired token. Directing customer to hosted card change checkout to restore MRR annuity.',
          needsHumanApproval: false,
          compliance,
        };
      }

      return {
        decision: 'send_payment_link',
        rationaleCode: 'HALTED_AUTOPAY_EXHAUSTED_DIRECT_ACTION',
        rationaleExplanation: 'Razorpay 4-attempt auto-retry cycle exhausted. Initiating high-priority payment link with DLT-compliant service message.',
        needsHumanApproval: false,
        compliance,
      };
    }

    if (stage === 'stage_halted_plus3') {
      return {
        decision: 'send_reminder',
        rationaleCode: 'HALTED_T3_URGENT_REMINDER',
        rationaleExplanation: 'T+3 days post-halt. Sending firm service reminder before impending service disruption.',
        needsHumanApproval: false,
        compliance,
      };
    }

    if (stage === 'stage_halted_plus7') {
      const isHighValue = amountPaise >= 1000000; // >= ₹10,000
      return {
        decision: 'offer_grace_period',
        rationaleCode: 'HALTED_T7_GRACE_PERIOD_OFFER',
        rationaleExplanation: 'T+7 days post-halt. Offering 7-day grace extension with automatic late fee waiver.',
        needsHumanApproval: isHighValue,
        compliance,
      };
    }

    if (stage === 'stage_halted_plus14') {
      return {
        decision: 'escalate_to_human',
        rationaleCode: 'LADDER_EXHAUSTED_HUMAN_HANDOFF',
        rationaleExplanation: 'T+14 days post-halt. Dunning ladder fully exhausted. Handing off to human customer success queue.',
        needsHumanApproval: true,
        compliance,
      };
    }

    return {
      decision: 'stop',
      rationaleCode: 'TERMINAL_STATE_STOP',
      rationaleExplanation: 'Case in terminal state.',
      needsHumanApproval: false,
      compliance,
    };
  }

  // Process incoming Razorpay webhook event with full 2-layer idempotency
  public async processWebhook(event: {
    event_id: string;
    event_type: 'subscription.pending' | 'subscription.halted' | 'subscription.charged' | 'payment.failed' | 'payment.captured';
    subscription_id: string;
    customer_name: string;
    customer_phone_masked: string;
    customer_email_masked: string;
    plan_name: string;
    amount_paise: number;
    error_code?: string;
    error_description?: string;
    error_source?: 'customer' | 'business' | 'gateway' | 'issuer';
    error_step?: string;
    error_reason?: string;
    auth_attempts?: number;
    timestamp?: number;
    arm?: ArmType;
    result_label?: ResultLabel;
    forced_stage?: LadderStage;
    payment_route?: 'agent_payment_link' | 'agent_card_update' | 'autopay' | 'unknown';
  }): Promise<{ auditEntry: AuditLogEntry; subCase: SubscriptionCase; isDuplicate: boolean }> {
    const timestamp = event.timestamp || this.mockedClockTime;
    const arm: ArmType = event.arm || (this.cases.has(event.subscription_id) ? this.cases.get(event.subscription_id)!.arm : (Math.random() < 0.2 ? 'control' : 'treatment'));
    const resultLabel: ResultLabel = event.result_label || 'simulated';

    // Layer 1 Idempotency: Webhook Event Deduplication
    if (this.processedWebhooks.has(event.event_id)) {
      console.log(`[Idempotency Layer 1] Duplicate webhook event ${event.event_id} ignored.`);
      const existingCase = this.cases.get(event.subscription_id)!;
      const lastAudit = this.auditLogs.find(a => a.webhook_event_id === event.event_id) || existingCase.history[existingCase.history.length - 1];
      return { auditEntry: lastAudit, subCase: existingCase, isDuplicate: true };
    }
    this.processedWebhooks.add(event.event_id);

    // Retrieve or initialize subscription case
    let subCase = this.cases.get(event.subscription_id);
    if (!subCase) {
      const diag = this.diagnoseFailure({
        errorCode: event.error_code,
        errorDescription: event.error_description,
        errorSource: event.error_source,
        errorStep: event.error_step,
        errorReason: event.error_reason,
        amountPaise: event.amount_paise,
      });

      subCase = {
        subscription_id: event.subscription_id,
        customer_id: `cust_${event.subscription_id.slice(4)}`,
        customer_name: event.customer_name,
        customer_email_masked: event.customer_email_masked,
        customer_phone_masked: event.customer_phone_masked,
        plan_name: event.plan_name,
        amount_paise: event.amount_paise,
        currency: 'INR',
        status: 'pending',
        current_stage: 'stage_0_pending',
        arm,
        reason_bucket: diag.reasonBucket,
        error_code: event.error_code || 'BAD_REQUEST_ERROR',
        error_description: event.error_description || 'Payment debit failed',
        error_source: event.error_source || 'issuer',
        error_step: event.error_step || 'payment_authorization',
        error_reason: event.error_reason || 'insufficient_funds',
        auth_attempts: event.auth_attempts || 1,
        charge_at: timestamp,
        contact_count_30d: 0,
        broken_promises_count: 0,
        outcome: 'not_recovered',
        mandate_restored: false,
        invoice_paid: false,
        history: [],
      };
      this.cases.set(event.subscription_id, subCase);
    }

    // Determine current ladder stage based on event
    let targetStage: LadderStage = subCase.current_stage;
    if (event.forced_stage) {
      targetStage = event.forced_stage;
      subCase.status = 'halted';
    } else if (event.event_type === 'subscription.halted') {
      subCase.status = 'halted';
      subCase.halted_at = subCase.halted_at || timestamp;
      targetStage = 'stage_halted_0';
    } else if (event.event_type === 'subscription.charged' || event.event_type === 'payment.captured') {
      subCase.status = 'active';
      subCase.recovered_at = timestamp;
      subCase.invoice_paid = true;
      // Invoice payment and mandate restoration are distinct outcomes. Only the hosted
      // card-update route proves the recurring mandate has been repaired.
      subCase.mandate_restored = event.payment_route === 'agent_card_update';
    } else if (event.event_type === 'subscription.pending') {
      subCase.status = 'pending';
      if (subCase.auth_attempts === 1) targetStage = 'stage_0_pending';
      else if (subCase.auth_attempts === 2) targetStage = 'stage_t1_pending';
      else if (subCase.auth_attempts === 3) targetStage = 'stage_t2_pending';
      else targetStage = 'stage_t3_pending';
    }
    subCase.current_stage = targetStage;

    // Layer 2 Idempotency Key: `subscription_id:stage`
    const idempotencyKey = `${event.subscription_id}:${targetStage}`;
    const isActionDuplicate = this.executedActionKeys.has(idempotencyKey);
    if (!isActionDuplicate) {
      this.executedActionKeys.add(idempotencyKey);
    }

    // Run Diagnosis & Lift Calculation
    const diag = this.diagnoseFailure({
      errorCode: event.error_code || subCase.error_code,
      errorDescription: event.error_description || subCase.error_description,
      errorSource: event.error_source || subCase.error_source,
      errorStep: event.error_step || subCase.error_step,
      errorReason: event.error_reason || subCase.error_reason,
      amountPaise: subCase.amount_paise,
    });
    subCase.reason_bucket = diag.reasonBucket;

    const decisionCostPaise = computeDecisionTimeCostPaise(
      { messageCount: 1, llmTokenCostPaise: 0 },
      subCase.amount_paise,
      BENCHMARK_MATRIX[diag.reasonBucket].p_treated
    );
    const liftCalc = this.computeLiftAndNetEv(diag.reasonBucket, subCase.amount_paise, decisionCostPaise);

    // Run Policy Evaluation
    const policyResult = this.evaluatePolicy({
      subCase,
      reasonBucket: diag.reasonBucket,
      stage: targetStage,
      amountPaise: subCase.amount_paise,
      arm: subCase.arm,
      estimatedCostPaise: decisionCostPaise,
    });

    if (policyResult.needsHumanApproval) {
      subCase.needs_human_approval = true;
      subCase.human_approval_reason = policyResult.rationaleExplanation;
    }

    const isOutbound = this.isOutboundDecision(policyResult.decision);
    const scoredCase: ScoredCase = {
      subscriptionId: subCase.subscription_id,
      customerId: subCase.customer_id,
      ladderStage: targetStage as unknown as ScoredCase['ladderStage'],
      reasonBucket: diag.reasonBucket === 'afa_required' ? 'afa_incomplete' : diag.reasonBucket,
      decision: policyResult.decision,
      amountPaise: subCase.amount_paise,
      pBase: liftCalc.p_base,
      pTreated: liftCalc.p_treated,
      liftUsed: liftCalc.lift,
      expectedLiftValuePaise: liftCalc.expectedLiftValuePaise,
      costPaise: liftCalc.interventionCostPaise,
      netEvPaise: liftCalc.netEvPaise,
      policyVersion: 'v5-2026-08-28',
      arm: subCase.arm,
      costGuardrailPassed: liftCalc.interventionCostPaise <= Math.round(subCase.amount_paise * 0.05),
    };
    const ledgerClock = () => new Date(timestamp * 1000);
    const reservation = isOutbound && !this.dryRunActive
      ? reserveAction(operationalDb, {
          case: scoredCase,
          actionType: policyResult.decision,
          initialStatus: policyResult.compliance.quiet_hours_ok ? 'reserved' : 'queued',
          dryRun: false,
          clock: ledgerClock,
        })
      : undefined;
    const hasLedgerReservation = Boolean(reservation && reservation.reserved);
    let checkoutUrl: string | undefined;
    if (reservation && reservation.reserved === false) {
      checkoutUrl = reservation.existing.hosted_url || undefined;
    }
    let executionChannel = 'no_outbound_action';
    let providerDispatchFailed = false;

    if (isOutbound && this.dryRunActive) {
      executionChannel = 'dry_run_no_dispatch';
    } else if (reservation && !reservation.reserved) {
      executionChannel = 'idempotent_reuse_no_dispatch';
    } else if (isOutbound && !policyResult.compliance.quiet_hours_ok) {
      executionChannel = 'queued_quiet_hours';
    } else if (hasLedgerReservation && reservation?.reserved) {
      const isCardUpdate = policyResult.decision === 'send_card_update_link';
      if (resultLabel === 'observed_test' && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        const providerResult = isCardUpdate
          ? await getCardUpdateCheckoutUrl({ subscriptionId: subCase.subscription_id })
          : await createPaymentLink({
              subscriptionId: subCase.subscription_id,
              ladderStage: targetStage,
              amountPaise: subCase.amount_paise,
              customerName: subCase.customer_name.split(' ')[0],
              description: `Outstanding ${subCase.plan_name} subscription payment`,
            });
        if (providerResult.ok === true) {
          checkoutUrl = providerResult.hostedUrl;
          recordActionDispatched(operationalDb, reservation.row.id, {
            provider: providerResult.provider,
            providerRefId: providerResult.providerRefId,
            hostedUrl: providerResult.hostedUrl,
            resultLabel: 'observed_test',
          }, ledgerClock);
          executionChannel = isCardUpdate ? 'razorpay_hosted_card_change_checkout' : 'razorpay_payment_link';
        } else {
          providerDispatchFailed = true;
          recordActionFailed(operationalDb, reservation.row.id, providerResult.error);
          executionChannel = 'razorpay_dispatch_failed';
        }
      } else {
        checkoutUrl = isCardUpdate
          ? `https://rzp.io/i/card-update-${subCase.subscription_id.slice(4)}`
          : `https://rzp.io/i/pay-${subCase.subscription_id.slice(4)}`;
        recordActionDispatched(operationalDb, reservation.row.id, {
          provider: resultLabel === 'simulated' ? 'simulator' : 'dry_run',
          providerRefId: `sim:${reservation.row.id}`,
          hostedUrl: checkoutUrl,
          resultLabel: 'simulated',
        }, ledgerClock);
        executionChannel = isCardUpdate ? 'simulated_hosted_card_change_checkout' : 'simulated_payment_link';
      }
    }

    const mayDispatch = isOutbound && hasLedgerReservation && !this.dryRunActive && policyResult.compliance.quiet_hours_ok && !providerDispatchFailed;

    // Contact accounting is deliberately attached to successful dispatch only. A repeated
    // webhook, dry run, or quiet-hours queue must never consume contact capital.
    if (mayDispatch) {
      subCase.contact_count_30d = this.contactsInWindow(subCase.customer_phone_masked, timestamp) + 1;
      subCase.last_action_at = timestamp;
    }

    // Generate LLM draft message if an outbound decision is made
    let messagePayload;
    if (mayDispatch) {
      const isCardUpdate = policyResult.decision === 'send_card_update_link';
      const formattedDate = new Date(timestamp * 1000).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      messagePayload = await draftHinglishMessage({
        firstName: subCase.customer_name.split(' ')[0],
        reasonBucket: diag.reasonBucket,
        amountPaise: subCase.amount_paise,
        stage: targetStage,
        merchantName: 'Acme Cloud India',
        formattedDate,
        mandateRef: `MND-${subCase.subscription_id.slice(4).toUpperCase()}`,
        checkoutUrl: checkoutUrl!,
        isCardUpdate,
      });
    }

    // Determine Attribution Outcome
    let outcome: AttributionOutcome = 'not_recovered';
    if (event.event_type === 'subscription.charged' || event.event_type === 'payment.captured') {
      const attribution = correlatePaymentEvent(operationalDb, {
        subscriptionId: subCase.subscription_id,
        eventType: event.event_type,
        amountPaise: subCase.amount_paise,
        paymentRoute: event.payment_route,
        occurredAt: timestamp,
      }, ledgerClock);
      outcome = attribution.outcome === 'organic' ? 'recovered_by_autopay'
        : attribution.outcome === 'unattributed' ? 'unattributed'
        : attribution.outcome;
    } else if (policyResult.decision === 'stop') {
      outcome = 'stopped';
    } else if (policyResult.decision === 'escalate_to_human') {
      outcome = 'escalated';
    }
    subCase.outcome = outcome;

    // Telemetry Timeline Steps
    const telemetry: TelemetryStep[] = [
      {
        step_id: `step_sig_${timestamp}`,
        timestamp,
        title: `Signal Ingested: ${event.event_type}`,
        description: `Webhook received with source=${subCase.error_source}, reason=${subCase.error_reason}`,
        status: 'completed',
        details: { event_id: event.event_id, attempts: subCase.auth_attempts },
      },
      {
        step_id: `step_diag_${timestamp}`,
        timestamp,
        title: `Deterministic Diagnosis: ${diag.reasonBucket}`,
        description: `${diag.description} (Confidence: ${diag.confidence})`,
        status: 'completed',
        details: { lift: liftCalc.lift, p_base: liftCalc.p_base, p_treated: liftCalc.p_treated },
      },
      {
        step_id: `step_ev_${timestamp}`,
        timestamp,
        title: `Lift-Based Net EV: ₹${(liftCalc.netEvPaise / 100).toFixed(2)}`,
        description: `Expected lift ₹${(liftCalc.expectedLiftValuePaise / 100).toFixed(2)} vs intervention cost ₹${(liftCalc.interventionCostPaise / 100).toFixed(2)}`,
        status: 'completed',
        details: { net_ev_paise: liftCalc.netEvPaise },
      },
      {
        step_id: `step_pol_${timestamp}`,
        timestamp,
        title: `Policy Decision: ${policyResult.decision}`,
        description: policyResult.rationaleExplanation,
        status: 'completed',
        details: { code: policyResult.rationaleCode, arm: subCase.arm },
      },
    ];

    if (messagePayload) {
      telemetry.push({
        step_id: `step_llm_${timestamp}`,
        timestamp,
        title: 'Hinglish Message Drafted & Compliance Spliced',
        description: messagePayload.is_cached_archetype ? 'Served via Archetype Cache' : 'Generated via Gemini (Tokenized Minimal DPDP Payload)',
        status: 'completed',
        details: { archetype: messagePayload.archetype_key },
      });
    }

    if (outcome === 'direct' || outcome === 'assisted' || outcome === 'recovered_by_autopay') {
      telemetry.push({
        step_id: `step_rec_${timestamp}`,
        timestamp: timestamp + 3600,
        title: `Payment Verified & Attributed (${outcome})`,
        description: `Amount ₹${(subCase.amount_paise / 100).toLocaleString('en-IN')} captured. Mandate restored: ${subCase.mandate_restored ? 'YES (MRR preserved)' : 'NO (Single invoice)'}`,
        status: 'completed',
      });
    }

    // Deterministic human readable audit explanation string
    const humanExplanation = `[${subCase.arm.toUpperCase()}] Sub ${subCase.subscription_id} diagnosed as ${diag.reasonBucket} (Net EV: ₹${(liftCalc.netEvPaise / 100).toFixed(2)}). Policy evaluated: ${policyResult.decision} (${policyResult.rationaleCode}). Outcome: ${outcome}.`;

    const auditEntry: AuditLogEntry = {
      id: `aud_${timestamp}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      trigger_event: event.event_type,
      webhook_event_id: event.event_id,
      idempotency_key: idempotencyKey,
      subscription_id: subCase.subscription_id,
      customer_name: subCase.customer_name,
      customer_phone_masked: subCase.customer_phone_masked,
      plan_name: subCase.plan_name,
      arm: subCase.arm,
      result_label: resultLabel,
      diagnosis: `${diag.reasonBucket} (${subCase.error_reason}, source=${subCase.error_source})`,
      reason_bucket: diag.reasonBucket,
      diagnosis_confidence: diag.confidence,
      amount_paise: subCase.amount_paise,
      p_base: liftCalc.p_base,
      p_treated: liftCalc.p_treated,
      lift_used: liftCalc.lift,
      expected_lift_value_paise: liftCalc.expectedLiftValuePaise,
      intervention_cost_paise: liftCalc.interventionCostPaise,
      net_ev_paise: liftCalc.netEvPaise,
      cost_guardrail_check: `passed (${((liftCalc.interventionCostPaise / subCase.amount_paise) * 100).toFixed(2)}% of value, cap 5%)`,
      budget_allocation: reservation && !reservation.reserved ? 'not dispatched — action ledger key already consumed' : this.dryRunActive ? 'dry run — no dispatch' : !policyResult.compliance.quiet_hours_ok && isOutbound ? 'queued — outside 09:00–20:00 IST' : `pending ranked batch allocation; Net EV ₹${(liftCalc.netEvPaise / 100).toFixed(2)}`,
      policy_decision: policyResult.decision,
      policy_version: 'v5-2026-08-28',
      decision_rationale_code: policyResult.rationaleCode,
      compliance_checks: policyResult.compliance,
      llm_role: messagePayload ? 'drafted message copy only inside strict schema' : 'none (deterministic wait/stop)',
      compliance_fields_injected: messagePayload ? messagePayload.compliance_fields_injected : [],
      execution_channel: executionChannel,
      verify_check: 'listening for payment.captured / subscription.charged',
      outcome,
      invoice_paid: subCase.invoice_paid,
      mandate_restored: subCase.mandate_restored,
      mrr_preserved_paise: subCase.mandate_restored ? subCase.amount_paise : 0,
      human_readable_explanation: humanExplanation,
      message: messagePayload,
      telemetry,
      broken_promises_count: subCase.broken_promises_count,
      contact_count_30d: subCase.contact_count_30d,
    };

    subCase.history.push(auditEntry);
    this.auditLogs.unshift(auditEntry);
    this.persist();

    return { auditEntry, subCase, isDuplicate: false };
  }

  // Calculate comprehensive metrics and statistics (Treatment vs Control Delta)
  public calculateStats(): EngineStats {
    let treatmentCount = 0;
    let controlCount = 0;
    let treatmentRecoveredPaise = 0;
    let controlRecoveredPaise = 0;
    let mrrPreservedPaise = 0;
    let directCount = 0;
    let assistedCount = 0;
    let autopayCount = 0;
    let correctRestraintCount = 0;
    let totalInterventions = 0;
    let stoppedCasesCount = 0;

    for (const c of this.cases.values()) {
      if (c.arm === 'treatment') {
        treatmentCount++;
        if (c.invoice_paid) {
          treatmentRecoveredPaise += c.amount_paise;
        }
        if (c.mandate_restored) {
          mrrPreservedPaise += c.amount_paise;
        }
        if (c.outcome === 'direct') directCount++;
        if (c.outcome === 'assisted') assistedCount++;
        if (c.outcome === 'recovered_by_autopay') {
          autopayCount++;
          correctRestraintCount++;
        }
        if (c.outcome === 'stopped') stoppedCasesCount++;
        totalInterventions += c.contact_count_30d;
      } else {
        controlCount++;
        if (c.invoice_paid) {
          controlRecoveredPaise += c.amount_paise;
        }
      }
    }

    const totalCases = treatmentCount + controlCount;
    const treatmentRecoveredCases = Array.from(this.cases.values()).filter(c => c.arm === 'treatment' && c.invoice_paid).length;
    const controlRecoveredCases = Array.from(this.cases.values()).filter(c => c.arm === 'control' && c.invoice_paid).length;
    const treatmentRecoveryRate = treatmentCount > 0 ? treatmentRecoveredCases / treatmentCount : 0;
    const controlRecoveryRate = controlCount > 0 ? controlRecoveredCases / controlCount : 0;
    const liftRate = Math.max(0, treatmentRecoveryRate - controlRecoveryRate);

    // Headline net attributable recovery: Treatment actual - Estimated counterfactual if unassisted
    const counterfactualControlPaise = controlCount > 0 ? Math.round((controlRecoveredPaise / controlCount) * treatmentCount) : 0;
    const netAttributablePaise = Math.max(0, treatmentRecoveredPaise - counterfactualControlPaise);

    // Settlement reporting includes the actual gateway MDR + GST only for
    // captured payments; decision-time logs retain the probability-weighted cost.
    const totalInterventionCostPaise = Array.from(this.cases.values())
      .filter(c => c.arm === 'treatment' && c.contact_count_30d > 0)
      .reduce((sum, c) => sum + computeSettlementCostPaise(
        { messageCount: c.contact_count_30d, llmTokenCostPaise: 0 },
        c.invoice_paid ? c.amount_paise : 0
      ), 0);
    const roiMultiple = totalInterventionCostPaise > 0 ? (netAttributablePaise / totalInterventionCostPaise) : 0;

    // Two-proportion Z-test for statistical significance
    const p1 = treatmentRecoveryRate;
    const p2 = controlRecoveryRate;
    const n1 = treatmentCount || 1;
    const n2 = controlCount || 1;
    const pPooled = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2)) || 0.001;
    const zScore = (p1 - p2) / se;
    // Approximate p-value from Z
    const pValue = 2 * (1 - this.normalCdf(Math.abs(zScore)));
    const statisticallySignificant = pValue < 0.05;

    return {
      total_cases: totalCases,
      treatment_cases: treatmentCount,
      control_cases: controlCount,
      treatment_recovered_amount_paise: treatmentRecoveredPaise,
      control_recovered_amount_paise: controlRecoveredPaise,
      net_attributable_recovery_paise: netAttributablePaise,
      treatment_recovery_rate: treatmentRecoveryRate,
      control_recovery_rate: controlRecoveryRate,
      lift_rate: liftRate,
      mrr_preserved_paise: mrrPreservedPaise,
      direct_recovered_count: directCount,
      assisted_recovered_count: assistedCount,
      autopay_recovered_count: autopayCount,
      correct_restraint_count: correctRestraintCount,
      correct_restraint_rate: treatmentCount > 0 ? correctRestraintCount / treatmentCount : 0,
      total_interventions: totalInterventions,
      total_intervention_cost_paise: totalInterventionCostPaise,
      roi_multiple: parseFloat(roiMultiple.toFixed(1)),
      z_score: parseFloat(zScore.toFixed(2)),
      p_value: parseFloat(pValue.toFixed(4)),
      statistically_significant: statisticallySignificant,
      stopped_cases_count: stoppedCasesCount,
      archetype_cache_hits: 0,
      archetype_cache_misses: 0,
      llm_tokens_spent_approx: 0,
      queued_actions_count: this.auditLogs.filter(log => log.execution_channel === 'queued_quiet_hours').length,
    };
  }

  private normalCdf(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - prob : prob;
  }
}

export const globalEngine = new RecoveryEngine({ persist: true });
