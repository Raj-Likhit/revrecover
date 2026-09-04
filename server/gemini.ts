import { GoogleGenAI } from '@google/genai';
import { MessagePayload, ReasonBucket, LadderStage } from '../src/types/revrecover.js';

// Initialize Gemini client with user-agent header as per guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-memory Archetype Cache: (reason_bucket:stage:language) -> draft template
const archetypeCache = new Map<string, { greeting: string; body: string; cta: string }>();

export let cacheHits = 0;
export let cacheMisses = 0;

function parseDraft(rawText: string): { greeting: string; body: string; cta: string } | undefined {
  try {
    const value: unknown = JSON.parse(rawText);
    if (!value || typeof value !== 'object') return undefined;
    const draft = value as Record<string, unknown>;
    if (typeof draft.greeting !== 'string' || typeof draft.body !== 'string' || typeof draft.cta !== 'string') return undefined;
    if (draft.greeting.length > 60 || draft.body.length > 240 || draft.cta.length > 80) return undefined;
    return { greeting: draft.greeting, body: draft.body, cta: draft.cta };
  } catch { return undefined; }
}

async function generateWithTimeout(prompt: string): Promise<{ greeting: string; body: string; cta: string } | undefined> {
  const request = ai.models.generateContent({ model: 'gemini-3.7-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
  const timeout = new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), 6000));
  const response = await Promise.race([request.then(value => parseDraft(value.text || '')), timeout]);
  return response;
}

// Tokenized minimal DPDP payload (strictly no full PII: no card, no mandate ref, no phone, only first name & band)
export interface TokenizedMinimalPayload {
  first_name: string;
  reason_bucket: ReasonBucket;
  amount_band: string; // e.g. "₹200-500", "₹5,000-10,000", "₹15,000+"
  stage: LadderStage;
  language: 'hinglish' | 'english';
}

function getAmountBand(amountPaise: number): string {
  const rupees = amountPaise / 100;
  if (rupees <= 500) return '₹200 - ₹500';
  if (rupees <= 2000) return '₹500 - ₹2,000';
  if (rupees <= 10000) return '₹2,000 - ₹10,000';
  if (rupees <= 15000) return '₹10,000 - ₹15,000 (No AFA)';
  return '₹15,000+ (Requires AFA)';
}

export async function draftHinglishMessage(params: {
  firstName: string;
  reasonBucket: ReasonBucket;
  amountPaise: number;
  stage: LadderStage;
  merchantName: string;
  formattedDate: string;
  mandateRef: string;
  checkoutUrl: string;
  isCardUpdate: boolean;
}): Promise<MessagePayload> {
  const {
    firstName,
    reasonBucket,
    amountPaise,
    stage,
    merchantName,
    formattedDate,
    mandateRef,
    checkoutUrl,
    isCardUpdate,
  } = params;

  const amountBand = getAmountBand(amountPaise);
  const archetypeKey = `${reasonBucket}:${stage}:hinglish`;

  let draft: { greeting: string; body: string; cta: string };
  let servedFromCache = false;

  // Check Archetype Cache first to eliminate redundant network calls & compute
  if (archetypeCache.has(archetypeKey)) {
    cacheHits++;
    servedFromCache = true;
    draft = archetypeCache.get(archetypeKey)!;
  } else {
    cacheMisses++;
    try {
      if (process.env.GEMINI_API_KEY) {
        // Construct strictly tokenized payload compliant with DPDP minimal sharing
        const minimalPrompt = `You are a respectful, concise billing assistant for an Indian SaaS subscription.
Draft a warm, polite Hinglish WhatsApp service notification for a failed payment.
Tokenized Context:
- Customer First Name: "${firstName}"
- Reason Bucket: "${reasonBucket}"
- Amount Band: "${amountBand}"
- Stage: "${stage}"
- Action Type: "${isCardUpdate ? 'Card Mandate Update' : 'Invoice Payment Link'}"

Rules:
1. Output strictly valid JSON matching: {"greeting": "...", "body": "...", "cta": "..."}
2. Tone: Helpful, courteous, professional Hinglish (mix of Hindi & English naturally used in urban India).
3. Do NOT include actual card numbers, raw amounts, or dates in the body — use placeholders like {{AMOUNT}}, {{DATE}}, {{MERCHANT}}.
4. Keep the body under 200 characters. No salesy or pushy language.`;

        // A malformed response or timeout gets exactly one retry; the caller always receives deterministic copy.
        const parsed = await generateWithTimeout(minimalPrompt) || await generateWithTimeout(minimalPrompt);
        if (parsed) {
          draft = parsed;
          archetypeCache.set(archetypeKey, draft);
        } else {
          draft = getDeterministicTemplate(firstName, reasonBucket, stage, isCardUpdate);
        }
      } else {
        draft = getDeterministicTemplate(firstName, reasonBucket, stage, isCardUpdate);
        archetypeCache.set(archetypeKey, draft);
      }
    } catch (err) {
      console.warn('Gemini drafting fallback activated:', err);
      draft = getDeterministicTemplate(firstName, reasonBucket, stage, isCardUpdate);
    }
  }

  // Deterministically inject compliance and specific transaction fields
  // (Never let the LLM hallucinate or draft legal/financial values)
  const formattedRupees = `₹${(amountPaise / 100).toLocaleString('en-IN')}`;
  
  let dynamicBody = draft.body
    .replace(/\{\{NAME\}\}/g, firstName)
    .replace(/\{\{AMOUNT\}\}/g, formattedRupees)
    .replace(/\{\{MERCHANT\}\}/g, merchantName)
    .replace(/\{\{DATE\}\}/g, formattedDate);

  // If the draft didn't have template placeholders, format nicely
  if (!dynamicBody.includes(formattedRupees)) {
    if (isCardUpdate) {
      dynamicBody += ` Aapka ${merchantName} mandate expire ya decline ho gaya hai. Agle billing cycle ke uninterrupted access ke liye card details update karein.`;
    } else {
      dynamicBody += ` Aapka ${merchantName} auto-debit of ${formattedRupees} process nahi ho paya. Kripya neeche diye link se securely complete karein.`;
    }
  }

  // Spliced compliance footer (DLT & RBI compliance)
  const renderedFullText = `${draft.greeting} ${firstName}!
${dynamicBody}

💳 Action Link: ${checkoutUrl}
🔒 Mandate Ref: ${mandateRef}
📋 Class: Service Notification | Grievance: support@${merchantName.toLowerCase().replace(/\s+/g, '')}.com
ℹ️ Reply STOP to opt-out.`;

  return {
    greeting: draft.greeting,
    body: dynamicBody,
    cta: draft.cta,
    rendered_full_text: renderedFullText,
    is_cached_archetype: servedFromCache,
    archetype_key: archetypeKey,
    compliance_fields_injected: [
      'merchant_name',
      'amount_in_rupees',
      'debit_date',
      'mandate_reference',
      'dlt_service_class',
      'grievance_contact',
      'opt_out_line',
    ],
  };
}

function getDeterministicTemplate(
  firstName: string,
  reasonBucket: ReasonBucket,
  stage: LadderStage,
  isCardUpdate: boolean
): { greeting: string; body: string; cta: string } {
  if (isCardUpdate || reasonBucket === 'mandate_expired') {
    return {
      greeting: 'Namaste',
      body: 'Aapka card mandate update require kar raha hai taaki aapka subscription bina kisi rukawat chalta rahe.',
      cta: 'Update Card Mandate Securely',
    };
  }

  if (reasonBucket === 'afa_required') {
    return {
      greeting: 'Hello',
      body: 'RBI guidelines ke hisaab se is transaction ke liye Additional Factor Authentication (OTP) zaroori hai. Link par tap karke verify karein.',
      cta: 'Authenticate & Pay ₹{{AMOUNT}}',
    };
  }

  if (reasonBucket === 'insufficient_funds') {
    return {
      greeting: 'Hi',
      body: 'Aapka monthly recurring charge process nahi ho saka. Quick 1-click link se settle karein.',
      cta: 'Pay Now {{AMOUNT}}',
    };
  }

  return {
    greeting: 'Namaste',
    body: 'Aapke active subscription ka billing attempt complete nahi ho paya. Secure gateway link se retry karein.',
    cta: 'Retry Payment',
  };
}
