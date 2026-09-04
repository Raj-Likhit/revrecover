import React from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  MessageSquare, 
  IndianRupee, 
  UserCheck, 
  ArrowRight,
  Smartphone,
  Copy,
  Layers,
  Lock
} from 'lucide-react';
import { AuditLogEntry, SubscriptionCase } from '../types/revrecover.js';

interface CaseTimelineModalProps {
  auditEntry: AuditLogEntry | null;
  subCase?: SubscriptionCase | null;
  onClose: () => void;
  onSimulatePayment?: (subscriptionId: string) => void;
}

export const CaseTimelineModal: React.FC<CaseTimelineModalProps> = ({
  auditEntry,
  subCase,
  onClose,
  onSimulatePayment,
}) => {
  if (!auditEntry) return null;

  const formattedRupees = (auditEntry.amount_paise / 100).toLocaleString('en-IN');
  const dateStr = new Date(auditEntry.timestamp * 1000).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                auditEntry.arm === 'treatment' 
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                  : 'bg-stone-800 text-stone-300 border-stone-700'
              }`}>
                ARM: {auditEntry.arm.toUpperCase()}
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Sub ID: {auditEntry.subscription_id}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">
                {auditEntry.result_label}
              </span>
            </div>
            <h3 className="text-lg font-bold text-stone-100 mt-1">
              Case Lifecycle & Telemetry Drill-down
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Key Facts Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
              <span className="text-stone-500 block text-[10px]">Customer / Plan</span>
              <span className="text-stone-200 font-bold">{auditEntry.customer_name}</span>
              <span className="text-stone-400 block text-[10px] truncate">{auditEntry.plan_name}</span>
            </div>

            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
              <span className="text-stone-500 block text-[10px]">Amount / Paise</span>
              <span className="text-amber-300 font-bold">₹{formattedRupees}</span>
              <span className="text-stone-400 block text-[10px]">{auditEntry.amount_paise} paise</span>
            </div>

            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
              <span className="text-stone-500 block text-[10px]">Net EV / Lift</span>
              <span className="text-emerald-400 font-bold">₹{(auditEntry.net_ev_paise / 100).toFixed(2)}</span>
              <span className="text-stone-400 block text-[10px]">Lift: +{(auditEntry.lift_used * 100).toFixed(0)}%</span>
            </div>

            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
              <span className="text-stone-500 block text-[10px]">Attribution Outcome</span>
              <span className="text-cyan-300 font-bold uppercase">{auditEntry.outcome}</span>
              <span className="text-stone-400 block text-[10px]">
                Mandate: {auditEntry.mandate_restored ? 'Restored (MRR Saved)' : 'Single'}
              </span>
            </div>
          </div>

          {/* DPDP Minimal Tokenized Payload Section */}
          <div className="bg-stone-950 rounded-xl p-4 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-stone-200 uppercase tracking-wider font-mono">
                  DPDP Act Compliance: Tokenized Minimal Payload (Zero Raw PII)
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                100% PII Masked
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Per India DPDP Act standards, only minimal tokenized parameters are shared with the Gemini model. Raw credit card numbers, full phone numbers, and mandate IDs are strictly kept in isolated deterministic memory.
            </p>
            <div className="bg-stone-900 rounded-lg p-3 font-mono text-xs text-stone-300 overflow-x-auto border border-stone-800">
              {JSON.stringify(
                {
                  first_name: auditEntry.customer_name.split(' ')[0],
                  reason_bucket: auditEntry.reason_bucket,
                  amount_band: auditEntry.amount_paise > 1500000 ? '₹15,000+ (Requires AFA)' : '₹2,000 - ₹10,000',
                  stage: auditEntry.policy_decision,
                  language: 'hinglish',
                  card_data: '[NEVER_SHARED_WITH_LLM]',
                  mandate_token: '[NEVER_SHARED_WITH_LLM]',
                },
                null,
                2
              )}
            </div>
          </div>

          {/* WhatsApp UI Message Preview */}
          {auditEntry.message && (
            <div className="bg-stone-950 rounded-xl p-4 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-stone-200 uppercase tracking-wider font-mono">
                    Outbound WhatsApp Service Message (TRAI DLT Template)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-stone-400">
                  {auditEntry.message.is_cached_archetype ? 'Archetype Cached' : 'Live Generated'}
                </span>
              </div>

              {/* Chat Bubble Container */}
              <div className="bg-[#0b141a] p-4 rounded-xl border border-stone-800 max-w-lg mx-auto shadow-inner">
                <div className="bg-[#005c4b] text-white p-3.5 rounded-lg rounded-tl-none space-y-2 text-xs leading-relaxed shadow">
                  <div className="font-semibold text-emerald-200 flex items-center justify-between text-[11px] border-b border-emerald-600/40 pb-1">
                    <span>Acme Cloud India (Service Alert)</span>
                    <span className="text-[10px] opacity-80">{dateStr}</span>
                  </div>

                  <p className="whitespace-pre-line text-stone-100 font-sans">
                    {auditEntry.message.rendered_full_text}
                  </p>

                  <div className="pt-2 border-t border-emerald-600/40 text-center">
                    <button className="w-full py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded text-xs transition">
                      {auditEntry.message.cta}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step-by-Step Telemetry Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider font-mono">
              Step-by-Step Telemetry Event Chain
            </h4>
            <div className="space-y-3">
              {auditEntry.telemetry?.map((step, idx) => (
                <div
                  key={step.step_id || idx}
                  className="flex items-start gap-3 bg-stone-950 p-3.5 rounded-xl border border-stone-800/80"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-200">{step.title}</span>
                      <span className="text-[10px] font-mono text-stone-500">
                        {new Date(step.timestamp * 1000).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">{step.description}</p>
                    {step.details && (
                      <div className="text-[10px] font-mono text-stone-500 bg-stone-900/60 p-1.5 rounded border border-stone-800/40 mt-1">
                        {JSON.stringify(step.details)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between">
          <div className="text-xs text-stone-500 font-mono">
            Idempotency Key: {auditEntry.idempotency_key}
          </div>
          <div className="flex items-center gap-2">
            {!auditEntry.invoice_paid && onSimulatePayment && (
              <button
                onClick={() => {
                  onSimulatePayment(auditEntry.subscription_id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
              >
                Simulate Payment.Captured
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
