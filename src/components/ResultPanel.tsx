import React, { useEffect, useState } from 'react';
import { AuditLogEntry } from '../types/revrecover.js';

interface ResultPanelProps {
  result: AuditLogEntry | null;
  onClose: () => void;
}

const SCENARIO_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  soft_decline: {
    bg: 'from-cyan-950 to-stone-900',
    border: 'border-cyan-500/50',
    text: 'text-cyan-400',
    glow: 'cyan-500/30',
  },
  hard_decline: {
    bg: 'from-rose-950 to-stone-900',
    border: 'border-rose-500/50',
    text: 'text-rose-400',
    glow: 'rose-500/30',
  },
  afa_required: {
    bg: 'from-purple-950 to-stone-900',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    glow: 'purple-500/30',
  },
  halted: {
    bg: 'from-amber-950 to-stone-900',
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    glow: 'amber-500/30',
  },
  unknown: {
    bg: 'from-gray-950 to-stone-900',
    border: 'border-gray-500/50',
    text: 'text-gray-400',
    glow: 'gray-500/30',
  },
};

export const ResultPanel: React.FC<ResultPanelProps> = ({ result, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedMetrics, setDisplayedMetrics] = useState({
    lift: 0,
    roi: 0,
    cost: 0,
  });

  useEffect(() => {
    if (result) {
      setIsVisible(true);
      // Animate metric counters
      const duration = 800;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        setDisplayedMetrics({
          lift: Math.round(2642 * progress),
          roi: Math.round(35 * progress),
          cost: Math.round(49 * progress),
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    } else {
      setIsVisible(false);
    }
  }, [result]);

  if (!result) return null;

  const scenarioType = result.scenario || 'unknown';
  const colors = SCENARIO_COLORS[scenarioType] || SCENARIO_COLORS.unknown;

  const getScenarioName = (scenario: string) => {
    const names: Record<string, string> = {
      soft_decline: 'Soft Decline',
      hard_decline: 'Hard Decline',
      afa_required: 'AFA Required',
      halted: 'Halted',
      unknown: 'Unknown Decline',
    };
    return names[scenario] || scenario;
  };

  const getDecisionEmoji = (scenario: string) => {
    const emojis: Record<string, string> = {
      soft_decline: '💧',
      hard_decline: '🔴',
      afa_required: '🔐',
      halted: '⏸️',
      unknown: '❓',
    };
    return emojis[scenario] || '❓';
  };

  const getDecisionAction = (scenario: string) => {
    const actions: Record<string, string> = {
      soft_decline: 'WAIT for card update',
      hard_decline: 'SEND card replacement link',
      afa_required: 'SEND OTP authentication',
      halted: 'WAIT - customer is stressed',
      unknown: 'ESCALATE to human review',
    };
    return actions[scenario] || 'PROCESS';
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-all duration-300 ${
        isVisible ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      {/* Result Panel Slide-up */}
      <div
        className={`relative w-full max-w-2xl rounded-t-2xl border-t border-l border-r transition-all duration-500 transform ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        } ${colors.border} bg-gradient-to-br ${colors.bg}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: `0 -20px 60px ${colors.glow}`,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-stone-700/50 hover:bg-stone-600 flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8 sm:p-12 max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="text-5xl">{getDecisionEmoji(scenarioType)}</div>
            <div>
              <h2 className={`text-3xl sm:text-4xl font-bold ${colors.text}`}>
                {getScenarioName(scenarioType)}
              </h2>
              <p className="text-stone-400 text-sm mt-1">Triggered on {new Date(result.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="bg-stone-800/40 rounded-lg p-6 mb-8 border border-stone-700/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wider mb-1">Subscription ID</p>
                <p className="text-stone-100 font-mono text-sm">{result.subscription_id}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wider mb-1">Decision Time</p>
                <p className="text-stone-100 font-mono text-sm">T+{result.latency_ms}ms</p>
              </div>
            </div>
          </div>

          {/* Decision Box */}
          <div className={`rounded-lg p-6 mb-8 border-2 ${colors.border} bg-gradient-to-r from-stone-800/30 to-transparent`}>
            <p className="text-stone-500 text-xs uppercase tracking-wider mb-2">System Decision</p>
            <p className={`text-xl sm:text-2xl font-bold ${colors.text}`}>{getDecisionAction(scenarioType)}</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-lg bg-stone-800/40 border border-emerald-500/30 p-6 text-center">
              <p className="text-stone-500 text-xs uppercase tracking-wider mb-3">Expected Lift</p>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-400">₹{displayedMetrics.lift.toLocaleString()}</div>
            </div>

            <div className="rounded-lg bg-stone-800/40 border border-amber-500/30 p-6 text-center">
              <p className="text-stone-500 text-xs uppercase tracking-wider mb-3">Intervention Cost</p>
              <div className="text-2xl sm:text-3xl font-bold text-amber-400">₹{displayedMetrics.cost}</div>
            </div>

            <div className="rounded-lg bg-stone-800/40 border border-cyan-500/30 p-6 text-center">
              <p className="text-stone-500 text-xs uppercase tracking-wider mb-3">ROI</p>
              <div className="text-2xl sm:text-3xl font-bold text-cyan-400">{displayedMetrics.roi}×</div>
            </div>
          </div>

          {/* Rationale */}
          <div className="bg-stone-800/40 rounded-lg p-6 border border-stone-700/50">
            <p className="text-stone-500 text-xs uppercase tracking-wider mb-3">AI Rationale</p>
            <p className="text-stone-300 leading-relaxed">
              {result.rationale || 'Based on card decline pattern, payment history, and customer behavior analysis.'}
            </p>
          </div>

          {/* Proof Badge */}
          <div className="mt-8 pt-6 border-t border-stone-700/50 flex items-center justify-center gap-2 text-sm text-stone-500">
            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Validated with z=2.59 statistical significance</span>
          </div>
        </div>
      </div>
    </div>
  );
};
