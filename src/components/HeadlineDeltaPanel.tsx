import React from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Scale, 
  IndianRupee, 
  Layers, 
  HelpCircle,
  Award,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { EngineStats, SensitivityScenario } from '../types/revrecover.js';
import { ExecutiveLiftCharts } from './ExecutiveLiftCharts.js';

interface HeadlineDeltaPanelProps {
  stats: EngineStats;
  sensitivity?: SensitivityScenario[];
}

export const HeadlineDeltaPanel: React.FC<HeadlineDeltaPanelProps> = ({ stats, sensitivity }) => {
  const treatmentRecoveryPct = (stats.treatment_recovery_rate * 100).toFixed(1);
  const controlRecoveryPct = (stats.control_recovery_rate * 100).toFixed(1);
  const liftPct = ((stats.treatment_recovery_rate - stats.control_recovery_rate) * 100).toFixed(1);

  const netAttributableRupees = (stats.net_attributable_recovery_paise / 100).toLocaleString('en-IN');
  const mrrPreservedRupees = (stats.mrr_preserved_paise / 100).toLocaleString('en-IN');
  const totalCostRupees = (stats.total_intervention_cost_paise / 100).toLocaleString('en-IN');
  const restraintPct = (stats.correct_restraint_rate * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Track Proposition Statement Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 border border-amber-500/20 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Core Thesis
              </span>
              <span className="text-xs text-stone-400 font-mono">Holdout Arm Controlled Trial (80 / 20)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-100 tracking-tight">
              Proving Every Rupee Against a 20% Control Group
            </h2>
            <p className="text-sm text-stone-400 max-w-3xl leading-relaxed">
              Razorpay’s smart retries already recover ~30% of failed payments unaided. RevRecover never claims organic wins as its own — scoring exclusively on <strong className="text-amber-300">incremental lift</strong> and <strong className="text-emerald-300">deliberate restraint</strong>.
            </p>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3.5 shrink-0 text-right space-y-1">
            <div className="text-[11px] font-mono text-stone-400">Statistical Significance</div>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs font-mono text-stone-300">Z = {stats.z_score}</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                stats.statistically_significant 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-stone-800 text-stone-400'
              }`}>
                p = {stats.p_value} ({stats.statistically_significant ? 'p < 0.05' : 'n.s.'})
              </span>
            </div>
            <div className="text-[10px] text-stone-500 font-mono">Two-proportion Z-test • [inferred]</div>
          </div>
        </div>
      </div>

      {/* 4 Major Metric Cards with Observed/Simulated/Inferred Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Net Attributable Recovered ₹ */}
        <div className="bg-stone-900/90 border border-stone-800 hover:border-amber-500/40 rounded-xl p-4 transition shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-stone-400">Net Attributable Recovery</span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              simulated
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight flex items-baseline gap-1">
              ₹{netAttributableRupees}
            </div>
            <div className="text-xs text-stone-400 flex items-center gap-1 mt-1">
              <span className="text-emerald-400 font-semibold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{liftPct}%
              </span>
              <span>lift over control</span>
            </div>
          </div>
          <div className="text-[11px] text-stone-500 border-t border-stone-800/80 pt-2 font-mono">
            Treatment ₹{(stats.treatment_recovered_amount_paise / 100).toLocaleString('en-IN')} − Control counterfactual
          </div>
        </div>

        {/* Metric 2: MRR Preserved via Mandate Restoration */}
        <div className="bg-stone-900/90 border border-stone-800 hover:border-emerald-500/40 rounded-xl p-4 transition shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-stone-400">Recurring MRR Preserved</span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              simulated
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono tracking-tight">
              ₹{mrrPreservedRupees}
              <span className="text-xs text-stone-400 font-sans font-normal ml-1">/mo</span>
            </div>
            <div className="text-xs text-stone-400 mt-1">
              Restored <strong className="text-stone-200">card mandates</strong> vs single invoices
            </div>
          </div>
          <div className="text-[11px] text-stone-500 border-t border-stone-800/80 pt-2 font-mono">
            Hosted card update checkout flow
          </div>
        </div>

        {/* Metric 3: Correct Restraint Rate */}
        <div className="bg-stone-900/90 border border-stone-800 hover:border-cyan-500/40 rounded-xl p-4 transition shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-stone-400">Deliberate Restraint Rate</span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              observed_test
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono tracking-tight">
              {restraintPct}%
            </div>
            <div className="text-xs text-stone-400 mt-1">
              <strong className="text-stone-200">{stats.correct_restraint_count} cases</strong> withheld for autopay
            </div>
          </div>
          <div className="text-[11px] text-stone-500 border-t border-stone-800/80 pt-2 font-mono">
            Zero customer annoyance & zero spend
          </div>
        </div>

        {/* Metric 4: True Cost ROI Multiple */}
        <div className="bg-stone-900/90 border border-stone-800 hover:border-purple-500/40 rounded-xl p-4 transition shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-stone-400">Cost ROI Multiple</span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              inferred
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-purple-300 font-mono tracking-tight">
              {stats.roi_multiple}x
            </div>
            <div className="text-xs text-stone-400 mt-1">
              Total Stack: ₹{totalCostRupees}
            </div>
          </div>
          <div className="text-[11px] text-stone-500 border-t border-stone-800/80 pt-2 font-mono">
            WhatsApp (₹0.115) + 2% MDR + LLM
          </div>
        </div>
      </div>

      {/* Side-by-Side Arm Breakdown (Treatment vs Control) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Treatment Arm (Agent-Assisted) */}
        <div className="bg-stone-900/80 border border-amber-500/30 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <h3 className="text-base font-bold text-stone-100">Treatment Arm (80% Cohort)</h3>
            </div>
            <span className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-semibold">
              {stats.treatment_cases} Cases • Active Agent
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-stone-950 p-3 rounded-lg border border-stone-800/80">
              <div className="text-[11px] font-mono text-stone-400">Total Recovery</div>
              <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
                {treatmentRecoveryPct}%
              </div>
              <div className="text-[10px] text-stone-500">{(stats.direct_recovered_count + stats.assisted_recovered_count + stats.autopay_recovered_count)} recovered</div>
            </div>

            <div className="bg-stone-950 p-3 rounded-lg border border-stone-800/80">
              <div className="text-[11px] font-mono text-stone-400">Direct Links</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                {stats.direct_recovered_count}
              </div>
              <div className="text-[10px] text-stone-500">Captured via link</div>
            </div>

            <div className="bg-stone-950 p-3 rounded-lg border border-stone-800/80">
              <div className="text-[11px] font-mono text-stone-400">Assisted / Organic</div>
              <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">
                {stats.assisted_recovered_count + stats.autopay_recovered_count}
              </div>
              <div className="text-[10px] text-stone-500">Attributed post-contact</div>
            </div>
          </div>

          <div className="text-xs text-stone-400 bg-stone-950/60 p-3 rounded-lg border border-stone-800/60 space-y-1">
            <div className="flex justify-between font-mono text-[11px]">
              <span>Interventions Dispatched:</span>
              <span className="text-stone-200 font-semibold">{stats.total_interventions} WhatsApp Service Templates</span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span>Archetype Cache Efficiency:</span>
              <span className="text-emerald-400 font-semibold">{((stats.archetype_cache_hits / (stats.archetype_cache_hits + stats.archetype_cache_misses || 1)) * 100).toFixed(0)}% Hits (Near-Zero LLM Compute)</span>
            </div>
          </div>
        </div>

        {/* Control Arm (Counterfactual Holdout) */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-500" />
              <h3 className="text-base font-bold text-stone-300">Control Arm (20% Holdout)</h3>
            </div>
            <span className="text-xs font-mono text-stone-400 bg-stone-800 px-2 py-0.5 rounded font-semibold">
              {stats.control_cases} Cases • Zero Contact
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-stone-950 p-3 rounded-lg border border-stone-800/80">
              <div className="text-[11px] font-mono text-stone-400">Organic Autopay Only</div>
              <div className="text-lg font-bold text-stone-300 font-mono mt-0.5">
                {controlRecoveryPct}%
              </div>
              <div className="text-[10px] text-stone-500">Unaided recovery</div>
            </div>

            <div className="bg-stone-950 p-3 rounded-lg border border-stone-800/80">
              <div className="text-[11px] font-mono text-stone-400">Dead Mandates Saved</div>
              <div className="text-lg font-bold text-rose-400 font-mono mt-0.5">
                0
              </div>
              <div className="text-[10px] text-stone-500">Requires card update</div>
            </div>

            <div className="bg-stone-950 p-3 rounded-lg border border-stone-800/80">
              <div className="text-[11px] font-mono text-stone-400">Total Spend</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                ₹0.00
              </div>
              <div className="text-[10px] text-stone-500">Zero intervention</div>
            </div>
          </div>

          <div className="text-xs text-stone-400 bg-stone-950/60 p-3 rounded-lg border border-stone-800/60 space-y-1">
            <div className="flex justify-between font-mono text-[11px]">
              <span>Counterfactual Baseline:</span>
              <span className="text-stone-300">Tracks standard Razorpay retry success without dunning</span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span>Lift Differential:</span>
              <span className="text-amber-400 font-semibold font-mono">+{liftPct}% Absolute Conversion Jump</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Data Science: Executive Lift Curves & Failure Buckets */}
      <ExecutiveLiftCharts stats={stats} sensitivity={sensitivity} />
    </div>
  );
};
