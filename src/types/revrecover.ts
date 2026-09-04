export type ReasonBucket = 
  | 'insufficient_funds'
  | 'technical_decline'
  | 'afa_required'
  | 'mandate_expired'
  | 'unknown_decline';

export type ArmType = 'treatment' | 'control';

export type ResultLabel = 'observed_test' | 'simulated' | 'inferred';

export type SubscriptionStatus = 'pending' | 'halted' | 'active' | 'cancelled';

export type LadderStage = 
  | 'stage_0_pending'
  | 'stage_t1_pending'
  | 'stage_t2_pending'
  | 'stage_t3_pending'
  | 'stage_halted_0'
  | 'stage_halted_plus3'
  | 'stage_halted_plus7'
  | 'stage_halted_plus14'
  | 'stopped';

export type PolicyDecision = 
  | 'wait_for_autopay'
  | 'send_reminder'
  | 'send_payment_link'
  | 'send_card_update_link'
  | 'offer_grace_period'
  | 'escalate_to_human'
  | 'stop';

export type AttributionOutcome = 
  | 'direct'
  | 'assisted'
  | 'recovered_by_autopay'
  | 'not_recovered'
  | 'unattributed'
  | 'stopped'
  | 'escalated';

export interface BenchmarkProbability {
  reason_bucket: ReasonBucket;
  p_base: number; // probability of recovery without agent (autopay only)
  p_treated: number; // probability of recovery with agent intervention
  lift: number; // p_treated - p_base
  description: string;
  basis: string;
}

export interface ComplianceChecks {
  afa_required: boolean;
  afa_basis: string;
  quiet_hours_ok: boolean;
  suppression_list_checked_at_send: boolean;
  annoyance_cap_passed: boolean;
  message_class: 'service' | 'promotional';
  llm_payload_pii: string;
  dlt_template_id: string;
}

export interface MessagePayload {
  greeting: string;
  body: string;
  cta: string;
  rendered_full_text: string;
  is_cached_archetype: boolean;
  archetype_key: string;
  compliance_fields_injected: string[];
}

export interface TelemetryStep {
  step_id: string;
  timestamp: number; // epoch seconds
  title: string;
  description: string;
  status: 'completed' | 'skipped' | 'stopped' | 'failed' | 'pending';
  details?: Record<string, any>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number; // 10-digit Unix seconds UTC
  trigger_event: string;
  webhook_event_id: string;
  idempotency_key: string;
  subscription_id: string;
  customer_name: string;
  customer_phone_masked: string;
  plan_name: string;
  arm: ArmType;
  result_label: ResultLabel;
  diagnosis: string;
  reason_bucket: ReasonBucket;
  diagnosis_confidence: 'high' | 'medium' | 'low';
  amount_paise: number; // integer paise
  p_base: number;
  p_treated: number;
  lift_used: number;
  expected_lift_value_paise: number;
  intervention_cost_paise: number;
  net_ev_paise: number;
  cost_guardrail_check: string;
  budget_allocation: string;
  policy_decision: PolicyDecision;
  policy_version: string;
  decision_rationale_code: string;
  compliance_checks: ComplianceChecks;
  llm_role: string;
  compliance_fields_injected: string[];
  execution_channel: string;
  verify_check: string;
  outcome: AttributionOutcome;
  invoice_paid: boolean;
  mandate_restored: boolean;
  mrr_preserved_paise: number;
  human_readable_explanation: string;
  message?: MessagePayload;
  telemetry: TelemetryStep[];
  broken_promises_count: number;
  contact_count_30d: number;
}

export interface SubscriptionCase {
  subscription_id: string;
  customer_id: string;
  customer_name: string;
  customer_email_masked: string;
  customer_phone_masked: string;
  plan_name: string;
  amount_paise: number;
  currency: string;
  status: SubscriptionStatus;
  current_stage: LadderStage;
  arm: ArmType;
  reason_bucket: ReasonBucket;
  error_code: string;
  error_description: string;
  error_source: 'customer' | 'business' | 'gateway' | 'issuer';
  error_step: string;
  error_reason: string;
  auth_attempts: number;
  charge_at: number; // epoch
  halted_at?: number;
  recovered_at?: number;
  last_action_at?: number;
  contact_count_30d: number;
  broken_promises_count: number;
  link_opened_at?: number;
  last_contact_window_started_at?: number;
  outcome: AttributionOutcome;
  mandate_restored: boolean;
  invoice_paid: boolean;
  history: AuditLogEntry[];
  needs_human_approval?: boolean;
  human_approval_reason?: string;
}

export interface EngineStats {
  total_cases: number;
  treatment_cases: number;
  control_cases: number;
  treatment_recovered_amount_paise: number;
  control_recovered_amount_paise: number;
  net_attributable_recovery_paise: number;
  treatment_recovery_rate: number;
  control_recovery_rate: number;
  lift_rate: number;
  mrr_preserved_paise: number;
  direct_recovered_count: number;
  assisted_recovered_count: number;
  autopay_recovered_count: number;
  correct_restraint_count: number;
  correct_restraint_rate: number;
  total_interventions: number;
  total_intervention_cost_paise: number;
  roi_multiple: number;
  z_score: number;
  p_value: number;
  statistically_significant: boolean;
  stopped_cases_count: number;
  archetype_cache_hits: number;
  archetype_cache_misses: number;
  llm_tokens_spent_approx: number;
  queued_actions_count?: number;
}

export interface SensitivityScenario {
  multiplier: number;
  label: 'Pessimistic (0.6x Lift)' | 'Base (1.0x Lift)' | 'Optimistic (1.4x Lift)';
  treatment_recovery_rate: number;
  control_recovery_rate: number;
  net_attributable_paise: number;
  mrr_preserved_paise: number;
  roi_multiple: number;
}

export interface AcceptanceTestCheck {
  id: string;
  title: string;
  description: string;
  status: 'passed' | 'failed';
  details: string;
  evidence: Record<string, any>;
}

export interface B2BInvoiceCase {
  invoice_id: string;
  customer_name: string;
  company_name: string;
  amount_paise: number;
  due_date: number; // epoch
  overdue_days: number;
  aging_bucket: '1-15d' | '16-30d' | '31-60d' | '60d+';
  status: 'unpaid' | 'paid' | 'settled_with_discount' | 'escalated_legal';
  recovery_action: string;
  working_capital_interest_saved_paise: number;
  outcome: string;
}
