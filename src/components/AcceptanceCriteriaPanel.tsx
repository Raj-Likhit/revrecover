import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  ShieldCheck, 
  Code, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { AcceptanceTestCheck } from '../types/revrecover.js';

export const AcceptanceCriteriaPanel: React.FC = () => {
  const [checks, setChecks] = useState<AcceptanceTestCheck[]>([]);
  const [allPassed, setAllPassed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const runTests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/acceptance-tests');
      const data = await res.json();
      setChecks(data.checks || []);
      setAllPassed(data.allPassed || false);
    } catch (err) {
      console.error('Acceptance tests fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
              Section 16 Pre-Demo Gate
            </span>
            <span className="text-xs text-stone-400 font-mono">
              Automated Integrity &amp; Safety Verification
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-100 mt-1">
            Acceptance Criteria Verification Suite
          </h2>
          <p className="text-xs text-stone-400">
            8 automated unit and integration checks verifying mathematical precision, idempotency, boundary handling, and regulatory guardrails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
              allPassed
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              {allPassed ? `${checks.length} / ${checks.length} Checks Passed` : 'Verification Incomplete'}
            </span>
          </div>
          <button
            onClick={runTests}
            disabled={isLoading}
            className="p-2 rounded-lg bg-stone-950 border border-stone-800 text-stone-300 hover:text-white transition disabled:opacity-50"
            title="Re-run verification suite"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {checks.map((c, idx) => (
          <div
            key={c.id}
            className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2.5 flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-stone-400 text-[10px]">Test #{idx + 1}</span>
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${c.status === 'passed' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                  {c.status.toUpperCase()}
                </span>
              </div>
              <h4 className="text-stone-200 font-bold text-xs">{c.title}</h4>
              <p className="text-stone-400 text-[11px] font-sans leading-relaxed">
                {c.description}
              </p>
            </div>

            <div className="pt-2 border-t border-stone-900 text-[11px] text-stone-300 bg-stone-900/60 p-2 rounded">
              <div className="text-stone-500 text-[10px]">Verified Evidence:</div>
              <div className="truncate text-emerald-300">{c.details}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
