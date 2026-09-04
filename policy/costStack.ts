/**
 * policy/costStack.ts
 * ---------------------------------------------------------------------------
 * Fixes: "Cost guardrail — Partial" gap. Replaces the fixed 12-paise
 * intervention cost with the full four-component stack from plan §15:
 *   messaging + LLM tokens (post-cache) + payment gateway MDR+GST + human review.
 *
 * Two entry points, matching the plan's own distinction between a
 * before-the-fact guardrail and an after-the-fact settlement number:
 *
 *  - `computeDecisionTimeCostPaise` — used for the net_ev / cost-guardrail
 *    check BEFORE acting. Gateway MDR+GST is inherently contingent on the
 *    payment actually capturing, so it's included as an EXPECTED cost
 *    (probability-weighted by p_treated), not the full fee. This weighting
 *    is a judgment call on my part, not verbatim in the plan — flag it if
 *    you use it.
 *  - `computeSettlementCostPaise` — used AFTER a payment.captured event, to
 *    report the true fully-loaded cost against a real recovered rupee
 *    (plan §15: "recovering ₹6,969 does not net ₹6,969").
 *
 * ADAPT: the MDR rate, GST rate, and loaded hourly human-review cost are
 * placeholders — put in your actual negotiated Razorpay MDR% and reviewer
 * cost before quoting an ROI multiple on stage.
 */

export const WHATSAPP_BASE_RATE_DECIPAISE = 115; // ₹0.115 = 11.5 paise = 115 decipaise
export const WHATSAPP_VOLUME_TIER_DECIPAISE = 95; // ~₹0.095 at higher volume, per plan §15
export const WHATSAPP_VOLUME_TIER_THRESHOLD = 100_000; // messages/month before the lower tier applies

export const DEFAULT_MDR_RATE = 0.02; // 2% — ADAPT to your actual negotiated rate
export const GST_RATE = 0.18; // GST on the gateway fee, not on the transaction amount

export const DEFAULT_LOADED_HOURLY_REVIEW_COST_PAISE = 50_000; // ₹500/hr loaded cost — ADAPT

export interface CostComponents {
  messageCount: number; // messages this action will actually send (usually 1)
  monthlyMessageVolume?: number; // for tiered WhatsApp pricing; omit to use base rate
  llmTokenCostPaise: number; // actual, post-archetype-cache — pass 0 on a cache hit
  humanReviewMinutes?: number; // 0 for auto-executed actions
  loadedHourlyReviewCostPaise?: number;
}

function whatsappRateDeciPaise(monthlyVolume?: number): number {
  return monthlyVolume && monthlyVolume >= WHATSAPP_VOLUME_TIER_THRESHOLD
    ? WHATSAPP_VOLUME_TIER_DECIPAISE
    : WHATSAPP_BASE_RATE_DECIPAISE;
}

function messagingCostPaise(c: CostComponents): number {
  const rateDeciPaise = whatsappRateDeciPaise(c.monthlyMessageVolume);
  return Math.round((c.messageCount * rateDeciPaise) / 10);
}

function humanReviewCostPaise(c: CostComponents): number {
  const minutes = c.humanReviewMinutes ?? 0;
  if (minutes <= 0) return 0;
  const hourly = c.loadedHourlyReviewCostPaise ?? DEFAULT_LOADED_HOURLY_REVIEW_COST_PAISE;
  return Math.round((minutes / 60) * hourly);
}

function gatewayFeePaise(amountPaise: number, mdrRate = DEFAULT_MDR_RATE): number {
  const mdr = amountPaise * mdrRate;
  const gst = mdr * GST_RATE;
  return Math.round(mdr + gst);
}

/** Before acting: gateway fee is expected, weighted by recovery probability. */
export function computeDecisionTimeCostPaise(
  c: CostComponents,
  amountPaise: number,
  pTreated: number,
  mdrRate = DEFAULT_MDR_RATE
): number {
  const expectedGatewayFee = Math.round(gatewayFeePaise(amountPaise, mdrRate) * pTreated);
  return messagingCostPaise(c) + c.llmTokenCostPaise + humanReviewCostPaise(c) + expectedGatewayFee;
}

/** After a payment.captured event: the real, fully-loaded cost against the actual recovery. */
export function computeSettlementCostPaise(
  c: CostComponents,
  amountPaise: number,
  mdrRate = DEFAULT_MDR_RATE
): number {
  return (
    messagingCostPaise(c) + c.llmTokenCostPaise + humanReviewCostPaise(c) + gatewayFeePaise(amountPaise, mdrRate)
  );
}
