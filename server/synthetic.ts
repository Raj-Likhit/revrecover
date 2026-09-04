import { ReasonBucket, ArmType, ResultLabel, SubscriptionCase } from '../src/types/revrecover.js';
import { BENCHMARK_MATRIX, RecoveryEngine } from './engine.js';

// Seeded pseudo-random number generator for reproducible benchmarks
class SeededRandom {
  private seed: number;
  constructor(seed: number = 42) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  public next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

const INDIAN_FIRST_NAMES = [
  'Aarav', 'Vihaan', 'Aditya', 'Rohan', 'Kabir', 'Ananya', 'Diya', 'Ishaan',
  'Pooja', 'Rahul', 'Neha', 'Siddharth', 'Tanvi', 'Vikram', 'Meera', 'Arjun',
  'Deepak', 'Sneha', 'Gaurav', 'Rhea', 'Karan', 'Priya', 'Naveen', 'Anjali',
];

const INDIAN_LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Iyer', 'Gupta', 'Singh', 'Nair',
  'Mehta', 'Rao', 'Chopra', 'Mukherjee', 'Deshmukh', 'Joshi', 'Bhat', 'Kapoor',
];

const SAAS_PLANS = [
  { name: 'Starter Monthly', amountPaise: 49900 },    // ₹499
  { name: 'Growth Monthly', amountPaise: 149900 },   // ₹1,499
  { name: 'Pro Developer Plan', amountPaise: 299900 },// ₹2,999
  { name: 'Team Enterprise', amountPaise: 696900 },  // ₹6,969 (High MRR)
  { name: 'Scale-Up Tier', amountPaise: 1499900 },   // ₹14,999 (Just under ₹15,000 AFA threshold)
  { name: 'Dedicated Cluster', amountPaise: 1850000 },// ₹18,500 (Crosses ₹15,000 AFA threshold)
];

export async function generateAndRunSyntheticBatch(
  engine: RecoveryEngine,
  count: number = 120,
  seed: number = 20260828
): Promise<{
  run_id: string;
  seed: number;
  total_generated: number;
  treatment_count: number;
  control_count: number;
}> {
  const rng = new SeededRandom(seed);
  engine.reset();

  const baseTimestamp = Math.floor(new Date('2026-08-28T06:00:00Z').getTime() / 1000);
  const runId = `RUN-${seed}-${Math.floor(rng.next() * 100000)}`;

  let treatmentCount = 0;
  let controlCount = 0;

  for (let i = 0; i < count; i++) {
    const firstName = INDIAN_FIRST_NAMES[Math.floor(rng.next() * INDIAN_FIRST_NAMES.length)];
    const lastName = INDIAN_LAST_NAMES[Math.floor(rng.next() * INDIAN_LAST_NAMES.length)];
    const customerName = `${firstName} ${lastName}`;
    const plan = SAAS_PLANS[Math.floor(rng.next() * SAAS_PLANS.length)];
    const subId = `sub_${seed.toString().slice(-4)}${(1000 + i).toString()}`;
    const phoneMasked = `+91 98${Math.floor(10000000 + rng.next() * 89999999).toString().slice(0, 2)}****${Math.floor(1000 + rng.next() * 8999)}`;
    const emailMasked = `${firstName.toLowerCase()}***@domain.in`;

    // 80/20 Holdout Control Arm assignment (baked in from Day 1)
    const isControl = rng.next() < 0.20;
    const arm: ArmType = isControl ? 'control' : 'treatment';
    if (isControl) controlCount++;
    else treatmentCount++;

    // Realistic Reason Bucket Distribution:
    // ~44% Insufficient funds (soft)
    // ~22% Technical decline (soft)
    // ~16% Mandate expired (hard)
    // ~12% AFA required (needs auth)
    // ~6% Unknown decline
    const rVal = rng.next();
    let reasonBucket: ReasonBucket;
    let errorReason: string;
    let errorSource: 'customer' | 'business' | 'gateway' | 'issuer';
    let errorCode = 'BAD_REQUEST_ERROR';

    if (rVal < 0.44) {
      reasonBucket = 'insufficient_funds';
      errorReason = 'insufficient_funds';
      errorSource = 'customer';
    } else if (rVal < 0.66) {
      reasonBucket = 'technical_decline';
      errorReason = 'bank_not_available';
      errorSource = 'gateway';
    } else if (rVal < 0.82) {
      reasonBucket = 'mandate_expired';
      errorReason = 'card_expired';
      errorSource = 'issuer';
    } else if (rVal < 0.94) {
      reasonBucket = 'afa_required';
      errorReason = 'authentication_required';
      errorSource = 'customer';
    } else {
      reasonBucket = 'unknown_decline';
      errorReason = 'card_declined';
      errorSource = 'issuer';
    }

    // Step 1: Initial failure at T=0
    const t0 = baseTimestamp - Math.floor(rng.next() * 86400 * 3);
    const eventId0 = `evt_${subId}_t0`;

    await engine.processWebhook({
      event_id: eventId0,
      event_type: 'subscription.pending',
      subscription_id: subId,
      customer_name: customerName,
      customer_phone_masked: phoneMasked,
      customer_email_masked: emailMasked,
      plan_name: plan.name,
      amount_paise: plan.amountPaise,
      error_code: errorCode,
      error_description: 'Mandate debit authorization failed',
      error_source: errorSource,
      error_step: 'payment_authorization',
      error_reason: errorReason,
      auth_attempts: 1,
      timestamp: t0,
      arm,
      result_label: 'simulated',
    });

    // Step 2: Simulate Progression through T+1..T+3 or Halted
    const benchmark = BENCHMARK_MATRIX[reasonBucket];
    const willAutopayRecover = rng.next() < benchmark.p_base;
    // The treatment draw is calibrated to the marginal treated probability. For soft
    // declines, the agent can only add recovery after the organic retry has failed.
    const conditionalLift = Math.max(0, Math.min(1, (benchmark.p_treated - benchmark.p_base) / (1 - benchmark.p_base)));
    const willSoftActionRecover = !willAutopayRecover && rng.next() < conditionalLift;
    const willAgentRecover = rng.next() < benchmark.p_treated;

    if (isControl) {
      // In Control: only organic autopay can recover
      if (willAutopayRecover) {
        await engine.processWebhook({
          event_id: `evt_${subId}_charged_ctrl`,
          event_type: 'subscription.charged',
          subscription_id: subId,
          customer_name: customerName,
          customer_phone_masked: phoneMasked,
          customer_email_masked: emailMasked,
          plan_name: plan.name,
          amount_paise: plan.amountPaise,
          timestamp: t0 + 86400,
          arm: 'control',
          result_label: 'simulated',
        });
      } else {
        // Halted after T+3
        await engine.processWebhook({
          event_id: `evt_${subId}_halted_ctrl`,
          event_type: 'subscription.halted',
          subscription_id: subId,
          customer_name: customerName,
          customer_phone_masked: phoneMasked,
          customer_email_masked: emailMasked,
          plan_name: plan.name,
          amount_paise: plan.amountPaise,
          timestamp: t0 + 86400 * 3,
          arm: 'control',
          result_label: 'simulated',
        });
      }
    } else {
      // In Treatment: Agent responds per policy
      if (reasonBucket === 'insufficient_funds' || reasonBucket === 'technical_decline') {
        // Soft decline: Agent held back during T+0..T+2
        if (willAutopayRecover) {
          // Autopay resolved it organically! (Correct restraint proved!)
          await engine.processWebhook({
            event_id: `evt_${subId}_charged_organic`,
            event_type: 'subscription.charged',
            subscription_id: subId,
            customer_name: customerName,
            customer_phone_masked: phoneMasked,
            customer_email_masked: emailMasked,
            plan_name: plan.name,
            amount_paise: plan.amountPaise,
            timestamp: t0 + 86400,
            arm: 'treatment',
            result_label: 'simulated',
          });
        } else {
          // Autopay failed, moves to halted at T+3
          await engine.processWebhook({
            event_id: `evt_${subId}_halted_treat`,
            event_type: 'subscription.halted',
            subscription_id: subId,
            customer_name: customerName,
            customer_phone_masked: phoneMasked,
            customer_email_masked: emailMasked,
            plan_name: plan.name,
            amount_paise: plan.amountPaise,
            timestamp: t0 + 86400 * 3,
            arm: 'treatment',
            result_label: 'simulated',
          });

          if (willSoftActionRecover) {
            // Recovered by payment link post-halt
            await engine.processWebhook({
              event_id: `evt_${subId}_captured_link`,
              event_type: 'payment.captured',
              subscription_id: subId,
              customer_name: customerName,
              customer_phone_masked: phoneMasked,
              customer_email_masked: emailMasked,
              plan_name: plan.name,
              amount_paise: plan.amountPaise,
              timestamp: t0 + 86400 * 3 + 7200,
              arm: 'treatment',
              result_label: 'simulated',
              payment_route: 'agent_payment_link',
            });
          }
        }
      } else if (reasonBucket === 'mandate_expired') {
        // Hard decline: Agent fired immediately at T=0
        if (willAgentRecover) {
          // Customer clicked card update link and restored mandate!
          await engine.processWebhook({
            event_id: `evt_${subId}_captured_mnd_restore`,
            event_type: 'payment.captured',
            subscription_id: subId,
            customer_name: customerName,
            customer_phone_masked: phoneMasked,
            customer_email_masked: emailMasked,
            plan_name: plan.name,
            amount_paise: plan.amountPaise,
            timestamp: t0 + 14400,
            arm: 'treatment',
            result_label: 'simulated',
            payment_route: 'agent_card_update',
          });
        } else {
          // Escalated to halted
          await engine.processWebhook({
            event_id: `evt_${subId}_halted_mnd`,
            event_type: 'subscription.halted',
            subscription_id: subId,
            customer_name: customerName,
            customer_phone_masked: phoneMasked,
            customer_email_masked: emailMasked,
            plan_name: plan.name,
            amount_paise: plan.amountPaise,
            timestamp: t0 + 86400 * 3,
            arm: 'treatment',
            result_label: 'simulated',
          });
        }
      } else if (reasonBucket === 'afa_required') {
        // AFA link sent
        if (willAgentRecover) {
          await engine.processWebhook({
            event_id: `evt_${subId}_captured_afa`,
            event_type: 'payment.captured',
            subscription_id: subId,
            customer_name: customerName,
            customer_phone_masked: phoneMasked,
            customer_email_masked: emailMasked,
            plan_name: plan.name,
            amount_paise: plan.amountPaise,
            timestamp: t0 + 3600,
            arm: 'treatment',
            result_label: 'simulated',
            payment_route: 'agent_payment_link',
          });
        }
      }
    }
  }

  return {
    run_id: runId,
    seed,
    total_generated: count,
    treatment_count: treatmentCount,
    control_count: controlCount,
  };
}

export function computeSensitivityBands(stats: ReturnType<RecoveryEngine['calculateStats']>) {
  const baseLift = stats.lift_rate;
  const baseRecovered = stats.net_attributable_recovery_paise;
  const baseMrr = stats.mrr_preserved_paise;
  const baseCost = stats.total_intervention_cost_paise || 1;

  return [
    {
      multiplier: 0.6,
      label: 'Pessimistic (0.6x Lift)' as const,
      treatment_recovery_rate: parseFloat((stats.control_recovery_rate + baseLift * 0.6).toFixed(3)),
      control_recovery_rate: stats.control_recovery_rate,
      net_attributable_paise: Math.round(baseRecovered * 0.6),
      mrr_preserved_paise: Math.round(baseMrr * 0.6),
      roi_multiple: parseFloat(((baseRecovered * 0.6) / baseCost).toFixed(1)),
    },
    {
      multiplier: 1.0,
      label: 'Base (1.0x Lift)' as const,
      treatment_recovery_rate: parseFloat(stats.treatment_recovery_rate.toFixed(3)),
      control_recovery_rate: stats.control_recovery_rate,
      net_attributable_paise: baseRecovered,
      mrr_preserved_paise: baseMrr,
      roi_multiple: stats.roi_multiple,
    },
    {
      multiplier: 1.4,
      label: 'Optimistic (1.4x Lift)' as const,
      treatment_recovery_rate: parseFloat((stats.control_recovery_rate + baseLift * 1.4).toFixed(3)),
      control_recovery_rate: stats.control_recovery_rate,
      net_attributable_paise: Math.round(baseRecovered * 1.4),
      mrr_preserved_paise: Math.round(baseMrr * 1.4),
      roi_multiple: parseFloat(((baseRecovered * 1.4) / baseCost).toFixed(1)),
    },
  ];
}
