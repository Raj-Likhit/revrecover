import React from 'react';
import { PauseCircle, Zap, CheckCircle2, ArrowRight, Shield, Clock, HelpCircle } from 'lucide-react';
import { BENCHMARK_MATRIX } from '../../server/engine.js';

export const RestraintShowcase: React.FC = () => {
  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 uppercase">
              Demonstrating Restraint
            </span>
            <span className="text-xs text-stone-400 font-mono">Policy Logic Comparison</span>
          </div>
          <h3 className="text-lg font-bold text-stone-100 mt-1">
            Why RevRecover Deliberately Waits on Soft Declines
          </h3>
        </div>
        <div className="text-xs text-stone-400 font-mono bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800">
          Decision = argmax(Net EV) subject to Annoyance Cap
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Soft Decline Card: Deliberate Restraint */}
        <div className="bg-stone-950/90 border border-cyan-500/30 rounded-xl p-5 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-stone-100">Soft Decline (Insufficient Funds / Timeout)</span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              ACTION: wait_for_autopay
            </span>
          </div>

          <div className="bg-stone-900/90 rounded-lg p-3 border border-stone-800/80 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-stone-400">Baseline Autopay Recovery (p_base):</span>
              <span className="text-cyan-300 font-bold">45.0% (Organic & Free)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Treated Recovery (p_treated):</span>
              <span className="text-stone-200">62.0%</span>
            </div>
            <div className="flex justify-between border-t border-stone-800 pt-1.5">
              <span className="text-stone-400">Incremental Lift:</span>
              <span className="text-amber-400 font-bold">+17.0%</span>
            </div>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed">
            <strong>The Restraint Principle:</strong> ~44% of recurring failures resolve naturally when Razorpay re-attempts charges at T+1 and T+2. Pestering customers immediately wastes contact capital and risks TCCCPR spam complaints.
          </p>

          <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-lg p-2.5 flex items-center gap-2 text-[11px] text-cyan-200 font-mono">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Agent holds back during T=0..T+2; acts only if halted at T+3.</span>
          </div>
        </div>

        {/* Hard Decline Card: Immediate Action */}
        <div className="bg-stone-950/90 border border-amber-500/30 rounded-xl p-5 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-stone-100">Hard Decline (Expired Card / Broken Mandate)</span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              ACTION: send_card_update_link
            </span>
          </div>

          <div className="bg-stone-900/90 rounded-lg p-3 border border-stone-800/80 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-stone-400">Baseline Autopay Recovery (p_base):</span>
              <span className="text-rose-400 font-bold">5.0% (Autopay Fails)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Treated Recovery (p_treated):</span>
              <span className="text-emerald-300 font-bold">30.0%</span>
            </div>
            <div className="flex justify-between border-t border-stone-800 pt-1.5">
              <span className="text-stone-400">Incremental Lift:</span>
              <span className="text-amber-400 font-bold">+25.0% (100% Attributable)</span>
            </div>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed">
            <strong>The Mandate Restoration Value:</strong> Autopay will <em>never</em> fix an expired card. Collecting a single invoice payment leaves the mandate dead next month. The agent immediately routes the customer to card update checkout.
          </p>

          <div className="bg-amber-950/30 border border-amber-500/20 rounded-lg p-2.5 flex items-center gap-2 text-[11px] text-amber-200 font-mono">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Saves ongoing recurring MRR annuity, not just this month's invoice.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
