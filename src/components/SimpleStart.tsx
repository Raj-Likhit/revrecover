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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-8">
        <h1 className="text-3xl font-bold text-amber-400 mb-3">
          Welcome to RevRecover
        </h1>
        <p className="text-stone-300 text-lg leading-relaxed">
          This system proves a simple idea: <strong className="text-white">Smart triage beats spray-and-pray.</strong>
          <br />
          <strong className="text-red-300">Hard declines?</strong> Act fast — card expired means autopay can never fix it.
          <br />
          <strong className="text-purple-300">High-value (AFA)?</strong> Send OTP link — customer wants to pay, just needs verification.
          <br />
          <strong className="text-blue-300">Soft declines?</strong> Show restraint — let autopay retry free daily.
          <br />
          <strong className="text-gray-300">Unknown errors?</strong> Escalate to human — better judgment than automation.
          <br />
          <strong className="text-orange-300">Service halted?</strong> Use empathy ladder — grace periods beat threats.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-stone-800/40 border border-stone-700 rounded-lg p-5">
          <div className="text-sm text-stone-400 mb-1">Net Attributable Recovery</div>
          <div className="text-2xl font-bold text-green-400">{formatPaise(netAttributable)}</div>
          <div className="text-xs text-stone-500 mt-1">Treatment minus Control</div>
        </div>
        
        <div className="bg-stone-800/40 border border-stone-700 rounded-lg p-5">
          <div className="text-sm text-stone-400 mb-1">Recovery Lift</div>
          <div className="text-2xl font-bold text-blue-400">
            +{(liftRate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Treatment {(treatmentRate * 100).toFixed(0)}% vs Control {(controlRate * 100).toFixed(0)}%
          </div>
        </div>

        <div className="bg-stone-800/40 border border-stone-700 rounded-lg p-5">
          <div className="text-sm text-stone-400 mb-1">Total Cases</div>
          <div className="text-2xl font-bold text-amber-400">{stats.total_cases}</div>
          <div className="text-xs text-stone-500 mt-1">
            {stats.treatment_cases} treatment, {stats.control_cases} control
          </div>
        </div>
      </div>

      {/* Step 1: Try It Yourself */}
      <div className="bg-stone-800/60 border border-stone-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-amber-500 text-stone-900 flex items-center justify-center font-bold">
            1
          </div>
          <h2 className="text-xl font-bold text-white">Try It Yourself</h2>
        </div>
        
        <p className="text-stone-300 mb-4">
          Click a scenario below to see how the system makes decisions for different failure types:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => handleTrigger('soft_decline_restraint', 'Soft Decline')}
            disabled={isTriggering}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-stone-700 text-white rounded-lg p-4 text-left transition-colors"
          >
            <div className="font-semibold mb-1">💧 Soft Decline</div>
            <div className="text-sm text-blue-100">
              Insufficient funds → System WAITS for autopay
            </div>
          </button>

          <button
            onClick={() => handleTrigger('hard_decline_card_expired', 'Hard Decline')}
            disabled={isTriggering}
            className="bg-red-600 hover:bg-red-700 disabled:bg-stone-700 text-white rounded-lg p-4 text-left transition-colors"
          >
            <div className="font-semibold mb-1">🔴 Hard Decline</div>
            <div className="text-sm text-red-100">
              Card expired → System ACTS immediately
            </div>
          </button>

          <button
            onClick={() => handleTrigger('afa_required_above_15k', 'AFA Required')}
            disabled={isTriggering}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-stone-700 text-white rounded-lg p-4 text-left transition-colors"
          >
            <div className="font-semibold mb-1">🔐 AFA Required</div>
            <div className="text-sm text-purple-100">
              High value (₹18.5k) → Needs OTP verification
            </div>
          </button>

          <button
            onClick={() => handleTrigger('halted_escalation', 'Halted')}
            disabled={isTriggering}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-stone-700 text-white rounded-lg p-4 text-left transition-colors"
          >
            <div className="font-semibold mb-1">⏸️ Subscription Halted</div>
            <div className="text-sm text-orange-100">
              Service offline → URGENT payment link
            </div>
          </button>

          <button
            onClick={() => handleTrigger('unknown_decline', 'Unknown Decline')}
            disabled={isTriggering}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-stone-700 text-white rounded-lg p-4 text-left transition-colors"
          >
            <div className="font-semibold mb-1">❓ Unknown Decline</div>
            <div className="text-sm text-gray-100">
              Generic error → Escalate to human review
            </div>
          </button>
        </div>

        {isTriggering && (
          <div className="mt-4 text-center text-stone-400">
            Processing...
          </div>
        )}

        {lastTriggered && !isTriggering && (
          <div className="mt-4 bg-stone-900/60 border border-stone-600 rounded-lg p-4">
            <div className="text-sm text-stone-400 mb-2">✓ Case Created</div>
            <div className="text-xs text-stone-500 mb-3">
              Subscription: {lastTriggered.subscription_id}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-400">Decision:</span>
                <span className="text-white font-semibold">{lastTriggered.policy_decision}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Reason:</span>
                <span className="text-amber-400 text-xs">{lastTriggered.decision_rationale_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Lift:</span>
                <span className="text-green-400">{(lastTriggered.lift_used * 100).toFixed(1)}%</span>
              </div>
            </div>

            <button
              onClick={() => onSwitchToTab('audit')}
              className="mt-3 w-full bg-amber-600 hover:bg-amber-700 text-white rounded py-2 text-sm font-medium transition-colors"
            >
              View Full Details in Audit Trail →
            </button>
          </div>
        )}
      </div>

      {/* Step 2: See the Proof */}
      <div className="bg-stone-800/60 border border-stone-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-500 text-stone-900 flex items-center justify-center font-bold">
            2
          </div>
          <h2 className="text-xl font-bold text-white">See the Proof</h2>
        </div>

        <div className="bg-stone-900/60 rounded-lg p-5 mb-4">
          <div className="text-center mb-4">
            <div className="text-sm text-stone-400 mb-2">How A/B Testing Works</div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded p-3">
                <div className="text-xs text-stone-400 mb-1">Treatment (80%)</div>
                <div className="text-2xl font-bold text-blue-400">{(treatmentRate * 100).toFixed(0)}%</div>
                <div className="text-xs text-stone-500">Agent acts</div>
              </div>
              <div className="bg-stone-700/40 border border-stone-600 rounded p-3">
                <div className="text-xs text-stone-400 mb-1">Control (20%)</div>
                <div className="text-2xl font-bold text-stone-300">{(controlRate * 100).toFixed(0)}%</div>
                <div className="text-xs text-stone-500">No agent</div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="inline-block bg-green-500/20 border border-green-500/30 rounded-lg px-6 py-3">
              <div className="text-xs text-stone-400 mb-1">Net Attributable Recovery</div>
              <div className="text-3xl font-bold text-green-400">{formatPaise(netAttributable)}</div>
              <div className="text-xs text-stone-500 mt-1">
                Z-score: {stats.z_score.toFixed(2)}, p-value: {stats.p_value.toFixed(4)}
                {stats.statistically_significant && <span className="text-green-400 ml-2">✓ Significant</span>}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => onSwitchToTab('simulator')}
          className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-3 font-medium transition-colors"
        >
          View Full Batch Results →
        </button>
      </div>

      {/* Step 3: Explore More */}
      <div className="bg-stone-800/60 border border-stone-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-purple-500 text-stone-900 flex items-center justify-center font-bold">
            3
          </div>
          <h2 className="text-xl font-bold text-white">Explore More</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => onSwitchToTab('audit')}
            className="bg-stone-700 hover:bg-stone-600 text-white rounded-lg p-4 text-left transition-colors"
          >
            <div className="font-semibold mb-1">📋 Audit Trail</div>
            <div className="text-sm text-stone-300">
              See every decision with full details
            </div>
          </button>

          <button
            onClick={() => onSwitchToTab('compliance')}
            className="bg-stone-700 hover:bg-stone-600 text-white rounded-lg p-4 text-left transition-colors"
          >
            <div className="font-semibold mb-1">✓ Compliance</div>
            <div className="text-sm text-stone-300">
              All acceptance criteria passing
            </div>
          </button>

          <button
            onClick={() => onSwitchToTab('trigger')}
            className="bg-stone-700 hover:bg-stone-600 text-white rounded-lg p-4 text-left transition-colors"
          >
            <div className="font-semibold mb-1">🎯 Live Trigger</div>
            <div className="text-sm text-stone-300">
              Test all 5 failure scenarios
            </div>
          </button>

          <button
            onClick={() => onSwitchToTab('dashboard')}
            className="bg-stone-700 hover:bg-stone-600 text-white rounded-lg p-4 text-left transition-colors"
          >
            <div className="font-semibold mb-1">📊 Full Dashboard</div>
            <div className="text-sm text-stone-300">
              Advanced view with all metrics
            </div>
          </button>
        </div>
      </div>

      {/* Key Concepts */}
      <div className="bg-stone-800/30 border border-stone-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Key Concepts</h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <span className="text-amber-400 font-bold">Restraint:</span>
            <span className="text-stone-300">
              Deliberately NOT messaging customers on soft declines (insufficient funds) because autopay will likely fix it for free
            </span>
          </div>
          
          <div className="flex gap-3">
            <span className="text-amber-400 font-bold">Lift:</span>
            <span className="text-stone-300">
              How much MORE recovery the agent enables vs. doing nothing (p_treated - p_base)
            </span>
          </div>
          
          <div className="flex gap-3">
            <span className="text-amber-400 font-bold">Control Group:</span>
            <span className="text-stone-300">
              20% of cases where the agent doesn't act at all — proves what autopay alone achieves
            </span>
          </div>
          
          <div className="flex gap-3">
            <span className="text-amber-400 font-bold">Net Attributable:</span>
            <span className="text-stone-300">
              Treatment recovery minus control recovery = the TRUE value the agent created
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
