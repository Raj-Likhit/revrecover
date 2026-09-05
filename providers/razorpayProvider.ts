/**
 * providers/razorpayProvider.ts
 * ---------------------------------------------------------------------------
 * Fixes: "Payment Link and hosted card-update execution — Not implemented
 * (mocked)" — the comparison report's largest flagged gap. Replaces
 * `mock_payment_link_whatsapp` / `mock_hosted_card_change_checkout` with
 * real Razorpay test-mode API calls.
 *
 * Two flows, per plan §4:
 *  - Soft-decline buckets → a Payment Link (collects THIS invoice).
 *  - Hard-decline buckets → the subscription's hosted card-update checkout
 *    (restores the MANDATE, not just the invoice). `resume` does NOT un-halt
 *    a subscription — only the customer updating their card via the hosted
 *    short_url (or `subscription_card_change=1`) does, or paying the issued
 *    invoice. This module never touches raw card data (PCI-DSS/tokenization
 *    forbids it) — it only ever returns a hosted URL for the customer.
 *
 * Call `reserveAction` from actionLedger.ts BEFORE calling either function
 * here — this module does not do idempotency itself, by design, so it can't
 * silently mint a second link on retry.
 *
 * ADAPT:
 *  - Uses plain `fetch` against Razorpay's REST API (no SDK dependency
 *    assumed). If you already have the `razorpay` npm package wired up
 *    elsewhere, swap these two functions to use it instead — the return
 *    shape (ProviderResult) is what matters to callers, not how you got there.
 *  - Reads RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET from env. Point these at
 *    your test-mode keys.
 */

import { logger } from '../server/logger.js';
import { RAZORPAY_TIMEOUT_MS, RAZORPAY_MAX_RETRIES } from '../server/constants.js';

const RAZORPAY_API_BASE = process.env.RAZORPAY_API_BASE ?? 'https://api.razorpay.com/v1';

export type ProviderResult =
  | { ok: true; provider: 'razorpay'; providerRefId: string; hostedUrl: string; raw: unknown }
  | { ok: false; error: string; retriable: boolean };

function authHeader(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set');
  }
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}

async function withTimeoutAndRetry<T>(fn: (signal: AbortSignal) => Promise<T>, retries = RAZORPAY_MAX_RETRIES): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RAZORPAY_TIMEOUT_MS);
    try {
      return await fn(controller.signal);
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

/**
 * Soft-decline path: creates a Razorpay Payment Link for the outstanding
 * amount. reference_id carries subscription_id + ladder_stage so the link
 * shows up correlated in the Razorpay dashboard even without your own DB.
 */
export async function createPaymentLink(params: {
  subscriptionId: string;
  ladderStage: string;
  amountPaise: number;
  customerName: string; // first name only — plan §7e: tokenized minimal payload
  customerContact?: string;
  description: string;
}): Promise<ProviderResult> {
  try {
    const body = {
      amount: params.amountPaise,
      currency: 'INR',
      description: params.description,
      reference_id: `${params.subscriptionId}:${params.ladderStage}`,
      customer: {
        name: params.customerName,
        contact: params.customerContact,
      },
      notify: { sms: false, email: false }, // you send via your own Hinglish/WhatsApp layer
      reminder_enable: false,
      notes: { subscription_id: params.subscriptionId, ladder_stage: params.ladderStage },
    };

    const res = await withTimeoutAndRetry((signal) =>
      fetch(`${RAZORPAY_API_BASE}/payment_links`, {
        method: 'POST',
        headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })
    );

    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json?.error?.description ?? `HTTP ${res.status}`, retriable: res.status >= 500 };
    }
    return { ok: true, provider: 'razorpay', providerRefId: json.id, hostedUrl: json.short_url, raw: json };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    logger.warn('Payment link creation failed', { error: message, subscriptionId: params.subscriptionId });
    return { ok: false, error: message, retriable: true };
  }
}

/**
 * Hard-decline path: fetches the subscription's hosted checkout URL and
 * appends the card-change flag. Per plan §4, PATCH cannot accept raw card
 * numbers and `resume` does not un-halt — this hosted flow is the only
 * correct way to restore a halted mandate.
 */
export async function getCardUpdateCheckoutUrl(params: { subscriptionId: string }): Promise<ProviderResult> {
  try {
    const res = await withTimeoutAndRetry((signal) =>
      fetch(`${RAZORPAY_API_BASE}/subscriptions/${params.subscriptionId}`, {
        method: 'GET',
        headers: { Authorization: authHeader() },
        signal,
      })
    );
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json?.error?.description ?? `HTTP ${res.status}`, retriable: res.status >= 500 };
    }
    if (!json.short_url) {
      return { ok: false, error: 'subscription has no short_url', retriable: false };
    }
    const hostedUrl = `${json.short_url}?subscription_card_change=1`;
    return { ok: true, provider: 'razorpay', providerRefId: params.subscriptionId, hostedUrl, raw: json };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    logger.warn('Card update checkout URL fetch failed', { error: message, subscriptionId: params.subscriptionId });
    return { ok: false, error: message, retriable: true };
  }
}
