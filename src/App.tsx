import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header.js';
import { Hero } from './components/Hero.js';
import { ProblemSolution } from './components/ProblemSolution.js';
import { ScenarioGrid } from './components/ScenarioGrid.js';
import { ResultPanel } from './components/ResultPanel.js';
import { MetricsStatement } from './components/MetricsStatement.js';
import { EngineStats, AuditLogEntry } from './types/revrecover.js';

export default function App() {
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastResult, setLastResult] = useState<AuditLogEntry | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load RevRecover state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleTriggerScenario = async (scenarioId: string): Promise<void> => {
    try {
      const res = await fetch('/api/trigger/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioId }),
      });
      const data = await res.json();
      setLastResult(data.auditEntry || null);
      await fetchState();
    } catch (err) {
      console.error('Trigger event error:', err);
    }
  };

  const handleCtaClick = () => {
    // Scroll to scenarios section
    const scenariosSection = document.getElementById('scenario-grid-section');
    if (scenariosSection) {
      scenariosSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="rr-shell min-h-screen flex items-center justify-center text-stone-300 font-mono text-sm bg-stone-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>Bootstrapping RevRecover Master Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rr-shell bg-stone-950 text-stone-100 flex min-h-screen flex-col font-sans">
      <Header onRefreshState={fetchState} />

      {/* Hero Section */}
      <Hero onCtaClick={handleCtaClick} />

      {/* Problem/Solution Section */}
      <ProblemSolution />

      {/* Scenario Grid Section */}
      <ScenarioGrid onScenarioClick={handleTriggerScenario} isLoading={false} />

      {/* Result Panel (Modal) */}
      <ResultPanel result={lastResult} onClose={() => setLastResult(null)} />

      {/* Metrics Statement Section */}
      <MetricsStatement />

      {/* Footer */}
      <footer className="border-t border-stone-700/60 py-8 px-4 sm:px-6 lg:px-8 bg-stone-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-sm font-bold text-stone-100 mb-1">RevRecover</h3>
              <p className="text-xs text-stone-500">AI-powered revenue recovery using intelligent restraint</p>
            </div>
            <a
              href="https://github.com/Raj-Likhit/revrecover"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
            >
              View source code →
            </a>
          </div>
          <div className="pt-6 border-t border-stone-700/50">
            <p className="text-xs font-mono text-stone-600">
              REVRECOVER / CARDS-ONLY RECOVERY PROTOTYPE · SIMULATED RESULTS ARE EXPLICITLY LABELED
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
