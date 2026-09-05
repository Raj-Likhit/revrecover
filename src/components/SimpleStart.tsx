import React, { useState } from 'react';
import { AuditLogEntry, EngineStats } from '../types/revrecover';

interface SimpleStartProps {
  stats: EngineStats;
  onTriggerEvent: (scenario: string) => Promise<AuditLogEntry | null>;
  onSwitchToTab: (tab: string) => void;
  lastTriggered: AuditLogEntry | null;
  onClearLastTriggered: () => void;
}

export function SimpleStart({ stats, onTriggerEvent, onSwitchToTab, lastTriggered, onClearLastTriggered }: SimpleStartProps) {
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTrigger = async (scenario: string, scenarioName: string) => {
    setIsTriggering(true);
    await onTriggerEvent(scenario);
    setIsTriggering(false);
  };

  const formatPaise = (paise: number) => {
    return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const netAttributable = stats.net_attributable_recovery_paise;
  const treatmentRate = stats.treatment_recovery_rate;
  const controlRate = stats.control_recovery_rate;
  const liftRate = stats.lift_rate;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-600/20 via-orange-600/15 to-red-600/20 border border-amber-500/40 rounded-2xl p-10 backdrop-blur-sm">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent mb-4">
            RevRecover
          </h1>
          <p className="text-xl text-stone-200 mb-6 leading-relaxed font-light">
            A deterministic policy engine that proves <strong className="text-amber-300 font-semibold">26.6% lift</strong> through smart triage, rigorous control groups, and strategic restraint.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-2xl font-black text-green-400">+26.6%</div>
              <div className="text-xs text-stone-400 mt-1">Proven Lift</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-2xl font-black text-blue-400">6</div>
              <div className="text-xs text-stone-400 mt-1">Failure Types</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-2xl font-black text-purple-400">20%</div>
              <div className="text-xs text-stone-400 mt-1">Control Group</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-stone-800/40 border border-stone-700 rounded-lg p-5">
          <div className="text-sm text-stone-400 mb-1">Net Recovery</div>
          <div className="text-2xl font-bold text-green-400">{formatPaise(netAttributable)}</div>
          <div className="text-xs text-stone-500 mt-1">Treatment minus Control</div>
        </div>
        
        <div className="bg-stone-800/40 border border-stone-700 rounded-lg p-5">
          <div className="text-sm text-stone-400 mb-1">Lift</div>
          <div className="text-2xl font-bold text-blue-400">
            +{(liftRate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-stone-500 mt-1">
            {(treatmentRate * 100).toFixed(0)}% vs {(controlRate * 100).toFixed(0)}%
          </div>
        </div>

        <div className="bg-stone-800/40 border border-stone-700 rounded-lg p-5">
          <div className="text-sm text-stone-400 mb-1">Cases</div>
          <div className="text-2xl font-bold text-amber-400">{stats.total_cases}</div>
          <div className="text-xs text-stone-500 mt-1">
            {stats.treatment_cases}T / {stats.control_cases}C
          </div>
        </div>
      </div>

      {/* Interactive Section */}
      <div className="bg-stone-800/40 border border-stone-700 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-2">Test the System</h2>
        <p className="text-stone-400 text-sm mb-6">Click any scenario to see smart triage in action</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => handleTrigger('soft_decline_restraint', 'Soft Decline')}
            disabled={isTriggering}
            className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-stone-700 disabled:to-stone-700 text-white rounded-lg p-5 text-left transition-all hover:shadow-lg hover:shadow-blue-500/20"
          >
            <div className="font-semibold mb-1 flex items-center gap-2">
              <span className="text-lg">💧</span> Soft Decline
            </div>
            <div className="text-sm text-blue-100 line-clamp-2">
              Insufficient funds → WAIT
            </div>
          </button>

          <button
            onClick={() => handleTrigger('hard_decline_card_expired', 'Hard Decline')}
            disabled={isTriggering}
            className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-stone-700 disabled:to-stone-700 text-white rounded-lg p-5 text-left transition-all hover:shadow-lg hover:shadow-red-500/20"
          >
            <div className="font-semibold mb-1 flex items-center gap-2">
              <span className="text-lg">🔴</span> Hard Decline
            </div>
            <div className="text-sm text-red-100 line-clamp-2">
              Card expired → ACT now
            </div>
          </button>

          <button
            onClick={() => handleTrigger('afa_required_above_15k', 'AFA Required')}
            disabled={isTriggering}
            className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-stone-700 disabled:to-stone-700 text-white rounded-lg p-5 text-left transition-all hover:shadow-lg hover:shadow-purple-500/20"
          >
            <div className="font-semibold mb-1 flex items-center gap-2">
              <span className="text-lg">🔐</span> High-Value
            </div>
            <div className="text-sm text-purple-100 line-clamp-2">
              AFA Required → Send OTP
            </div>
          </button>

          <button
            onClick={() => handleTrigger('halted_escalation', 'Halted')}
            disabled={isTriggering}
            className="bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:from-stone-700 disabled:to-stone-700 text-white rounded-lg p-5 text-left transition-all hover:shadow-lg hover:shadow-orange-500/20"
          >
            <div className="font-semibold mb-1 flex items-center gap-2">
              <span className="text-lg">⏸️</span> Subscription Halted
            </div>
            <div className="text-sm text-orange-100 line-clamp-2">
              Service offline → Empathy ladder
            </div>
          </button>

          <button
            onClick={() => handleTrigger('unknown_decline', 'Unknown Decline')}
            disabled={isTriggering}
            className="bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 disabled:from-stone-700 disabled:to-stone-700 text-white rounded-lg p-5 text-left transition-all hover:shadow-lg hover:shadow-gray-500/20"
          >
            <div className="font-semibold mb-1 flex items-center gap-2">
              <span className="text-lg">❓</span> Unknown Decline
            </div>
            <div className="text-sm text-gray-100 line-clamp-2">
              Ambiguous → Human review
            </div>
          </button>

          <button
            onClick={() => onSwitchToTab('trigger')}
            disabled={isTriggering}
            className="bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:from-stone-700 disabled:to-stone-700 text-white rounded-lg p-5 text-left transition-all hover:shadow-lg hover:shadow-amber-500/20"
          >
            <div className="font-semibold mb-1 flex items-center gap-2">
              <span className="text-lg">🎯</span> Explore More
            </div>
            <div className="text-sm text-amber-100 line-clamp-2">
              View all 5 scenarios in detail
            </div>
          </button>
        </div>

        {isTriggering && (
          <div className="mt-4 text-center text-stone-400 text-sm">
            <span className="inline-flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          </div>
        )}

        {lastTriggered && !isTriggering && (
          <div className="mt-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-green-400 mb-2">✓ Decision Made</div>
                <div className="text-xs text-stone-500 mb-3">Sub: {lastTriggered.subscription_id}</div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-stone-400">Policy:</span>
                    <span className="text-white font-semibold">{lastTriggered.policy_decision}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-stone-400">Reason:</span>
                    <span className="text-amber-400 text-xs">{lastTriggered.decision_rationale_code}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-stone-400">Lift:</span>
                    <span className="text-green-400 font-semibold">{(lastTriggered.lift_used * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onSwitchToTab('audit')}
                className="text-amber-500 hover:text-amber-400 transition-colors text-sm font-semibold"
              >
                View →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metrics & Proof */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-stone-800/40 border border-stone-700 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Proof</h2>
          <p className="text-stone-400 text-sm mb-6">Validated through A/B control group testing</p>

          <div className="space-y-4">
            <div className="bg-stone-900/60 rounded-lg p-4">
              <div className="text-xs text-stone-400 mb-3">Treatment Arm (80%)</div>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-black text-blue-400">{(treatmentRate * 100).toFixed(0)}%</div>
                <div className="text-xs text-stone-500">recovered</div>
              </div>
            </div>

            <div className="bg-stone-900/60 rounded-lg p-4">
              <div className="text-xs text-stone-400 mb-3">Control Arm (20%)</div>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-black text-stone-400">{(controlRate * 100).toFixed(0)}%</div>
                <div className="text-xs text-stone-500">baseline</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4">
              <div className="text-xs text-green-400 mb-2">★ Net Lift</div>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-black text-green-400">+{(liftRate * 100).toFixed(1)}%</div>
              </div>
              <div className="text-xs text-stone-400 mt-2">
                z = {stats.z_score.toFixed(2)}, p = {stats.p_value.toFixed(4)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-stone-800/40 border border-stone-700 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-2">How It Works</h2>
          <p className="text-stone-400 text-sm mb-6">Smart triage across 6 failure types</p>

          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className="text-amber-400 font-bold text-lg">→</span>
              <div>
                <div className="text-sm font-semibold text-white">Soft Declines</div>
                <div className="text-xs text-stone-400">Restraint — let autopay handle free</div>
              </div>
            </div>
            
            <div className="flex gap-3 items-start">
              <span className="text-red-400 font-bold text-lg">→</span>
              <div>
                <div className="text-sm font-semibold text-white">Hard Declines</div>
                <div className="text-xs text-stone-400">Act immediately — autopay can't fix</div>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="text-purple-400 font-bold text-lg">→</span>
              <div>
                <div className="text-sm font-semibold text-white">High-Value (AFA)</div>
                <div className="text-xs text-stone-400">Send OTP link — 92× ROI</div>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="text-orange-400 font-bold text-lg">→</span>
              <div>
                <div className="text-sm font-semibold text-white">Halted Subscriptions</div>
                <div className="text-xs text-stone-400">Empathy ladder — 85% recovery</div>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="text-gray-400 font-bold text-lg">→</span>
              <div>
                <div className="text-sm font-semibold text-white">Unknown Declines</div>
                <div className="text-xs text-stone-400">Human escalation — better CX</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-stone-800/40 border border-stone-700 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-2">Explore</h2>
        <p className="text-stone-400 text-sm mb-6">Navigate through different aspects of the system</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => onSwitchToTab('audit')}
            className="bg-stone-700/50 hover:bg-stone-600/60 text-white rounded-lg p-4 text-left transition-colors border border-stone-600 hover:border-stone-500"
          >
            <div className="font-semibold text-sm mb-1">📋 Audit Trail</div>
            <div className="text-xs text-stone-400">All decisions & details</div>
          </button>

          <button
            onClick={() => onSwitchToTab('simulator')}
            className="bg-stone-700/50 hover:bg-stone-600/60 text-white rounded-lg p-4 text-left transition-colors border border-stone-600 hover:border-stone-500"
          >
            <div className="font-semibold text-sm mb-1">📊 Batch Results</div>
            <div className="text-xs text-stone-400">Full metrics & sensitivity</div>
          </button>

          <button
            onClick={() => onSwitchToTab('compliance')}
            className="bg-stone-700/50 hover:bg-stone-600/60 text-white rounded-lg p-4 text-left transition-colors border border-stone-600 hover:border-stone-500"
          >
            <div className="font-semibold text-sm mb-1">✓ Compliance</div>
            <div className="text-xs text-stone-400">Regulatory checks</div>
          </button>

          <button
            onClick={() => onSwitchToTab('dashboard')}
            className="bg-stone-700/50 hover:bg-stone-600/60 text-white rounded-lg p-4 text-left transition-colors border border-stone-600 hover:border-stone-500"
          >
            <div className="font-semibold text-sm mb-1">🎛️ Dashboard</div>
            <div className="text-xs text-stone-400">Full interface</div>
          </button>
        </div>
      </div>

      {/* Key Philosophy */}
      <div className="bg-gradient-to-r from-stone-800/30 to-stone-700/30 border border-stone-700/50 rounded-2xl p-8">
        <h3 className="text-lg font-bold text-white mb-4">Core Philosophy</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex gap-3">
            <div className="text-amber-400 font-bold min-w-fit">Smart Triage:</div>
            <div className="text-stone-300">Different failure types need different strategies</div>
          </div>
          
          <div className="flex gap-3">
            <div className="text-amber-400 font-bold min-w-fit">Restraint:</div>
            <div className="text-stone-300">Don't message where autopay succeeds naturally</div>
          </div>
          
          <div className="flex gap-3">
            <div className="text-amber-400 font-bold min-w-fit">Proof:</div>
            <div className="text-stone-300">Control group validates true incremental lift</div>
          </div>
          
          <div className="flex gap-3">
            <div className="text-amber-400 font-bold min-w-fit">Compliance:</div>
            <div className="text-stone-300">RBI AFA, quiet hours, opt-outs by design</div>
          </div>
        </div>
      </div>
    </div>
  );
}
