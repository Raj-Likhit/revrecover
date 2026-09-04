import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  Layers, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles,
  BarChart3,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { SensitivityScenario, EngineStats } from '../types/revrecover.js';

interface BatchSimulatorProps {
  stats: EngineStats;
  sensitivity: SensitivityScenario[];
  onRunBatch: (count: number, seed: number) => Promise<void>;
}

export const BatchSimulator: React.FC<BatchSimulatorProps> = ({
  stats,
  sensitivity,
  onRunBatch,
}) => {
  const [count, setCount] = useState(120);
  const [seed, setSeed] = useState(20260828);
  const [isRunning, setIsRunning] = useState(false);

  const handleExecute = async () => {
    setIsRunning(true);
    try {
      await onRunBatch(count, seed);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 uppercase">
              Sensitivity &amp; Holdout Simulator
            </span>
            <span className="text-xs text-stone-400 font-mono">
              Seeded Random Response Model
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-100 mt-1">
            Batch Experiment &amp; Sensitivity Analysis
          </h2>
          <p className="text-xs text-stone-400">
            Simulate 100–200 Indian SaaS recurring card failures with reproducible seeds and inspect the sensitivity range.
          </p>
        </div>

        {/* Batch Configuration Form */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 font-mono">Count:</span>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 font-mono focus:outline-none"
            >
              <option value={50}>50 cases</option>
              <option value={120}>120 cases (Standard)</option>
              <option value={200}>200 cases (Large)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 font-mono">Seed:</span>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="w-28 px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 font-mono focus:outline-none"
            />
          </div>

          <button
            onClick={handleExecute}
            disabled={isRunning}
            className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isRunning ? (
              <span className="animate-pulse">Simulating...</span>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Run Batch
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sensitivity Bands (Pessimistic, Base, Optimistic) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Sensitivity Performance Band (pessimistic / base / optimistic)
          </h3>
          <span className="text-xs text-stone-500 font-mono">
            Lift × 0.6 / 1.0 / 1.4 Response Range
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sensitivity.map((scenario) => {
            const isBase = scenario.multiplier === 1.0;
            const isPessimistic = scenario.multiplier === 0.6;

            return (
              <div
                key={scenario.label}
                className={`p-4 rounded-xl border transition space-y-3 ${
                  isBase
                    ? 'bg-stone-950 border-purple-500/50 shadow-lg shadow-purple-500/5'
                    : 'bg-stone-950/60 border-stone-800'
                }`}
              >
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="font-bold text-xs text-stone-200">
                    {scenario.label}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-stone-400 bg-stone-900 px-1.5 py-0.5 rounded">
                    {scenario.multiplier}x Lift
                  </span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Recovery Rate:</span>
                    <span className="text-stone-200 font-bold">
                      {(scenario.treatment_recovery_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Net Attributable:</span>
                    <span className={`font-bold ${isPessimistic ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ₹{(scenario.net_attributable_paise / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">MRR Preserved:</span>
                    <span className="text-cyan-300 font-bold">
                      ₹{(scenario.mrr_preserved_paise / 100).toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-stone-800/80 pt-1.5">
                    <span className="text-stone-500">Cost ROI:</span>
                    <span className="text-purple-300 font-bold">
                      {scenario.roi_multiple}x
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
