import React from 'react';
import { 
  ShieldCheck, 
  BookOpen, 
  Lock, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Scale
} from 'lucide-react';

export const ComplianceViewer: React.FC = () => {
  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      <div className="border-b border-stone-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
            Regulatory Rigor
          </span>
          <span className="text-xs text-stone-400 font-mono">
            Independently Verified Against 2026 Primary Sources
          </span>
        </div>
        <h2 className="text-xl font-bold text-stone-100 mt-1">
          Indian Regulatory &amp; Messaging Compliance Framework
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: RBI E-mandate Framework 2026 */}
        <div className="bg-stone-950 p-5 rounded-xl border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-stone-100">
              RBI Digital Payments E-mandate Framework 2026
            </h3>
          </div>

          <div className="space-y-3 text-xs text-stone-300 leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-100">₹15,000 AFA Exemption Ceiling:</strong> Recurring debits up to ₹15,000 proceed without Additional Factor of Authentication. Values &gt; ₹15,000 route to OTP challenge.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-100">Mandate Modification Always Requires AFA:</strong> Updating an expired card modifies the underlying mandate, which legally requires authentication regardless of transaction value.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-100">Pre-Debit Notice Duty:</strong> Issuer banks hold the regulatory pre-debit notice duty. RevRecover links are customer-initiated payments, so they are not bound by the 24h bank pre-debit freeze.
              </div>
            </div>
          </div>
        </div>

        {/* Module 2: TRAI TCCCPR & DLT Messaging Law */}
        <div className="bg-stone-950 p-5 rounded-xl border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-stone-100">
              TRAI TCCCPR 2025 &amp; WhatsApp Commercial Standards
            </h3>
          </div>

          <div className="space-y-3 text-xs text-stone-300 leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-100">Strict Service Notification Class:</strong> Failed payment notices to active subscribers are service messages, constrained to approved DLT template slots (zero promotional upsell).
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-100">5-Complaints-in-10-Days Annoyance Cap:</strong> Max 4 outbound messages per 30 days protects against carrier sender suspension.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-100">WhatsApp Utility Pricing:</strong> Verified ₹0.115 per delivered message base rate (July 2025 per-message model). Inbound 24h reply window is free.
              </div>
            </div>
          </div>
        </div>

        {/* Module 3: DPDP Minimal Tokenized PII */}
        <div className="bg-stone-950 p-5 rounded-xl border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
            <Lock className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-stone-100">
              DPDP Act: Tokenized LLM Context Isolation
            </h3>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed">
            Zero raw payment details, credit card numbers, or mandate tokens are ever transmitted to the Gemini API. Only high-level tokens <code className="text-purple-300 font-mono">{"{first_name, amount_band, reason_bucket}"}</code> are passed.
          </p>
          <div className="bg-stone-900 p-3 rounded-lg font-mono text-[11px] text-stone-400 border border-stone-800">
            Compliance fields (Merchant Name, INR Amount, Date, Mandate Reference, Opt-out, Grievance line) are spliced deterministically post-drafting.
          </div>
        </div>

        {/* Module 4: Voluntary Quiet Hours Guardrail */}
        <div className="bg-stone-950 p-5 rounded-xl border border-stone-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-stone-100">
              09:00 – 20:00 IST Voluntary Quiet Hours
            </h3>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed">
            While technical service messages are exempt from carrier curfew, RevRecover adopts the conservative 09:00–20:00 IST window voluntarily to uphold customer trust and prevent nighttime dunning fatigue.
          </p>
          <div className="bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-lg text-[11px] text-emerald-300 font-mono">
            ✓ Engine checks clock seconds and queues outbound messages if triggered during quiet hours.
          </div>
        </div>
      </div>
    </div>
  );
};
