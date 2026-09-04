import React, { useState } from 'react';
import { 
  Play, 
  PauseCircle, 
  Zap, 
  ShieldAlert, 
  Clock, 
  HelpCircle, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AuditLogEntry } from '../types/revrecover.js';

interface LiveEventTriggerProps {
  onTriggerEvent: (scenario: string) => Promise<AuditLogEntry | null>;
  onInspectCase: (audit: AuditLogEntry) => void;
}

export const LiveEventTrigger: React.FC<LiveEventTriggerProps> = ({
  onTriggerEvent,
  onInspectCase,
}) => {
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AuditLogEntry | null>(null);

  const scenarios = [
    {
      id: 'soft_decline_restraint',
      title: '1. Soft Decline (₹1,499 Insufficient Funds)',
      subtitle: 'Lead with Restraint • T=0 Pending Debit',
      icon: PauseCircle,
      iconColor: 'text-cyan-400',
      badge: 'EXPECTED: wait_for_autopay',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      description: 'Razorpay daily retries are active. Organic recovery probability is high (0.45). The engine deliberately withholds outbound contact to protect contact capital.',
    },
    {
      id: 'hard_decline_card_expired',
      title: '2. Hard Decline (₹6,969 Expired Card Token)',
      subtitle: 'Immediate Action • Restore MRR Annuity',
      icon: Zap,
      iconColor: 'text-amber-400',
      badge: 'EXPECTED: send_card_update_link',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      description: 'Autopay will NEVER recover an expired token. Engine acts immediately at T=0, generating a hosted card update link with spliced DLT & RBI compliance fields.',
    },
    {
      id: 'afa_required_above_15k',
      title: '3. High Value (₹18,500 Dedicated Tier)',
      subtitle: 'RBI 2026 E-mandate Threshold Gate',
      icon: ShieldAlert,
      iconColor: 'text-purple-400',
      badge: 'EXPECTED: send_payment_link (AFA OTP)',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      description: 'Crosses the RBI ₹15,000 non-AFA exemption ceiling. Autopay retry cannot succeed without active 2FA. Engine routes customer to authenticated checkout.',
    },
    {
      id: 'halted_escalation',
      title: '4. Subscription Halted (Razorpay Retries Exhausted)',
      subtitle: 'T+3 Calendar Transition to Halted',
      icon: Clock,
      iconColor: 'text-rose-400',
      badge: 'EXPECTED: send_payment_link (High Priority)',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      description: 'Razorpay platform has given up after 4 failed attempts. Engine escalates from passive waiting to proactive dunning with late-fee grace options.',
    },
    {
      id: 'unknown_decline',
      title: '5. Generic Issuer Decline ("do_not_honor")',
      subtitle: 'Low-Confidence Prior • Early Escalation',
      icon: HelpCircle,
      iconColor: 'text-amber-300',
      badge: 'EXPECTED: escalate_to_human',
      badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      description: 'Ambiguous bank decline subcode. Rather than forcing a high-confidence guess, the engine routes to human review earlier with lower confidence.',
    },
  ];

  const handleRun = async (scenarioId: string) => {
    setLoadingScenario(scenarioId);
    try {
      const result = await onTriggerEvent(scenarioId);
      if (result) {
        setLastResult(result);
      }
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase">
              On-Stage Demo Trigger
            </span>
            <span className="text-xs text-stone-400 font-mono">Simulate Real Razorpay Webhook Ingestion</span>
          </div>
          <h2 className="text-xl font-bold text-stone-100 mt-1">
            Live Webhook Event Simulator
          </h2>
          <p className="text-sm text-stone-400">
            Click any scenario below to trigger a live webhook payload in test mode and observe the deterministic state machine, lift scoring, and Hinglish message generation in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            const isLoading = loadingScenario === sc.id;

            return (
              <div
                key={sc.id}
                className="bg-stone-950 border border-stone-800 hover:border-amber-500/40 rounded-xl p-4.5 transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${sc.iconColor} shrink-0`} />
                      <h4 className="text-sm font-bold text-stone-100">{sc.title}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${sc.badgeColor}`}>
                      {sc.badge}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {sc.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-stone-500">{sc.subtitle}</span>
                  <button
                    onClick={() => handleRun(sc.id)}
                    disabled={Boolean(loadingScenario)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="animate-pulse">Processing...</span>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" /> Fire Live Event
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Result Feedback Banner */}
      {lastResult && (
        <div className="bg-stone-900/90 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-bold text-stone-100">
                Live Webhook Ingested & Evaluated Deterministically!
              </span>
            </div>
            <span className="text-xs font-mono text-stone-400 bg-stone-950 px-2 py-1 rounded border border-stone-800">
              Sub ID: {lastResult.subscription_id}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800">
              <span className="text-stone-500 block text-[10px]">Diagnosis:</span>
              <span className="text-amber-300 font-semibold">{lastResult.diagnosis}</span>
            </div>
            <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800">
              <span className="text-stone-500 block text-[10px]">Net EV (Paise / ₹):</span>
              <span className="text-emerald-400 font-semibold">₹{(lastResult.net_ev_paise / 100).toFixed(2)}</span>
            </div>
            <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800">
              <span className="text-stone-500 block text-[10px]">Policy Decision:</span>
              <span className="text-cyan-300 font-semibold">{lastResult.policy_decision}</span>
            </div>
            <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800">
              <span className="text-stone-500 block text-[10px]">AFA Threshold Status:</span>
              <span className="text-purple-300 font-semibold">{lastResult.compliance_checks.afa_basis}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-800">
            <p className="text-xs text-stone-400 italic">
              "{lastResult.human_readable_explanation}"
            </p>
            <button
              onClick={() => onInspectCase(lastResult)}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              Inspect Complete Telemetry & LLM Payload <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
