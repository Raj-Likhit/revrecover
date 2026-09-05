import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header.js';
import { SimpleStart } from './components/SimpleStart.js';
import { HeadlineDeltaPanel } from './components/HeadlineDeltaPanel.js';
import { RestraintShowcase } from './components/RestraintShowcase.js';
import { LiveEventTrigger } from './components/LiveEventTrigger.js';
import { CaseTimelineModal } from './components/CaseTimelineModal.js';
import { AtRiskQueue } from './components/AtRiskQueue.js';
import { AuditTrailViewer } from './components/AuditTrailViewer.js';
import { BatchSimulator } from './components/BatchSimulator.js';
import { ComplianceViewer } from './components/ComplianceViewer.js';
import { AcceptanceCriteriaPanel } from './components/AcceptanceCriteriaPanel.js';
import { B2BReceivablesPanel } from './components/B2BReceivablesPanel.js';
import { SystemReportPanel } from './components/SystemReportPanel.js';
import { CustomWebhookBuilder } from './components/CustomWebhookBuilder.js';
import { EngineStats, SubscriptionCase, AuditLogEntry, SensitivityScenario } from './types/revrecover.js';

export default function App() {
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [cases, setCases] = useState<SubscriptionCase[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [sensitivity, setSensitivity] = useState<SensitivityScenario[]>([]);
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);
  const [dryRunActive, setDryRunActive] = useState<boolean>(false);
  const [mockedClockTime, setMockedClockTime] = useState<number>(Math.floor(Date.now() / 1000));
  const [isInsideQuietHours, setIsInsideQuietHours] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('simple-start');
  const [selectedAudit, setSelectedAudit] = useState<AuditLogEntry | null>(null);
  const [selectedCase, setSelectedCase] = useState<SubscriptionCase | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastTriggeredResult, setLastTriggeredResult] = useState<AuditLogEntry | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      setStats(data.stats);
      setCases(data.cases || []);
      setAuditLogs(data.recent_audit_logs || []);
      setSensitivity(data.sensitivity || []);
      setKillSwitchActive(data.kill_switch_active);
      setDryRunActive(data.dry_run_active);
      setMockedClockTime(data.mocked_clock_time);

      // Check quiet hours (09:00 - 20:00 IST)
      const date = new Date(data.mocked_clock_time * 1000);
      const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
      let istHours = utcHours + 5.5;
      if (istHours >= 24) istHours -= 24;
      setIsInsideQuietHours(istHours >= 9.0 && istHours <= 20.0);
    } catch (err) {
      console.error('Failed to load RevRecover state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleToggleKillSwitch = async () => {
    try {
      const res = await fetch('/api/settings/toggle-kill-switch', { method: 'POST' });
      const data = await res.json();
      setKillSwitchActive(data.kill_switch_active);
      await fetchState();
    } catch (err) {
      console.error('Toggle kill switch error:', err);
    }
  };

  const handleToggleDryRun = async () => {
    try {
      const res = await fetch('/api/settings/toggle-dry-run', { method: 'POST' });
      const data = await res.json();
      setDryRunActive(data.dry_run_active);
      await fetchState();
    } catch (err) {
      console.error('Toggle dry run error:', err);
    }
  };

  const handleAdvanceClock = async (hours: number) => {
    try {
      const res = await fetch('/api/settings/advance-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
      const data = await res.json();
      setMockedClockTime(data.mocked_clock_time);
      setIsInsideQuietHours(data.is_inside_quiet_hours);
      await fetchState();
    } catch (err) {
      console.error('Advance clock error:', err);
    }
  };

  const handleTriggerEvent = async (scenario: string): Promise<AuditLogEntry | null> => {
    try {
      const res = await fetch('/api/trigger/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      const data = await res.json();
      const auditEntry = data.auditEntry || null;
      setLastTriggeredResult(auditEntry); // Store the result so it persists
      await fetchState();
      return auditEntry;
    } catch (err) {
      console.error('Trigger event error:', err);
      return null;
    }
  };

  const handleRunBatch = async (count: number, seed: number) => {
    try {
      await fetch('/api/batch/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, seed }),
      });
      await fetchState();
    } catch (err) {
      console.error('Run batch error:', err);
    }
  };

  const handleApproveHumanAction = async (subscriptionId: string) => {
    try {
      await fetch('/api/case/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: subscriptionId, action: 'approve_and_send' }),
      });
      await fetchState();
    } catch (err) {
      console.error('Approve action error:', err);
    }
  };

  const handleSimulatePayment = async (subscriptionId: string) => {
    try {
      await fetch('/api/case/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: subscriptionId, action: 'simulate_payment_capture' }),
      });
      await fetchState();
    } catch (err) {
      console.error('Simulate payment error:', err);
    }
  };

  const handleInspectCase = (audit: AuditLogEntry) => {
    setSelectedAudit(audit);
    const matched = cases.find((c) => c.subscription_id === audit.subscription_id);
    setSelectedCase(matched || null);
  };

  const handleSelectCaseFromQueue = (subCase: SubscriptionCase) => {
    setSelectedCase(subCase);
    const lastAudit = subCase.history[subCase.history.length - 1] || auditLogs.find((a) => a.subscription_id === subCase.subscription_id);
    setSelectedAudit(lastAudit || null);
  };

  if (isLoading || !stats) {
    return (
      <div className="rr-shell min-h-screen flex items-center justify-center text-stone-300 font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>Bootstrapping RevRecover Master Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rr-shell text-stone-100 flex min-h-screen flex-col font-sans">
      <Header
        killSwitchActive={killSwitchActive}
        dryRunActive={dryRunActive}
        mockedClockTime={mockedClockTime}
        onToggleKillSwitch={handleToggleKillSwitch}
        onToggleDryRun={handleToggleDryRun}
        onAdvanceClock={handleAdvanceClock}
        onRefreshState={fetchState}
        isInsideQuietHours={isInsideQuietHours}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1 w-full max-w-[1480px] mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* SIMPLE START SCREEN */}
        {activeTab === 'simple-start' && (
          <div className="space-y-6 animate-in fade-in">
            <SimpleStart 
              stats={stats} 
              onTriggerEvent={handleTriggerEvent}
              onSwitchToTab={setActiveTab}
              lastTriggered={lastTriggeredResult}
              onClearLastTriggered={() => setLastTriggeredResult(null)}
            />
          </div>
        )}

        {/* TAB 1: AUDIT TRAIL (Moved up for easier access) */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in">
            <AuditTrailViewer
              logs={auditLogs}
              onSelectAudit={handleInspectCase}
            />
          </div>
        )}

        {/* TAB 2: BATCH SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="space-y-6 animate-in fade-in">
            <BatchSimulator
              stats={stats}
              sensitivity={sensitivity}
              onRunBatch={handleRunBatch}
            />
            <HeadlineDeltaPanel stats={stats} sensitivity={sensitivity} />
          </div>
        )}

        {/* TAB 3: LIVE TRIGGER */}
        {activeTab === 'trigger' && (
          <div className="space-y-6 animate-in fade-in">
            <LiveEventTrigger
              onTriggerEvent={handleTriggerEvent}
              onInspectCase={handleInspectCase}
            />
            <RestraintShowcase />
          </div>
        )}

        {/* TAB 4: COMPLIANCE */}
        {activeTab === 'compliance' && (
          <div className="space-y-6 animate-in fade-in">
            <ComplianceViewer />
          </div>
        )}

        {/* TAB 5: FULL DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            <HeadlineDeltaPanel stats={stats} sensitivity={sensitivity} />
            <RestraintShowcase />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LiveEventTrigger
                onTriggerEvent={handleTriggerEvent}
                onInspectCase={handleInspectCase}
              />
              <BatchSimulator
                stats={stats}
                sensitivity={sensitivity}
                onRunBatch={handleRunBatch}
              />
            </div>
            <AtRiskQueue
              cases={cases.slice(0, 15)}
              onSelectCase={handleSelectCaseFromQueue}
              onApproveHumanAction={handleApproveHumanAction}
            />
          </div>
        )}

        {/* ADVANCED TABS */}
        {activeTab === 'cases' && (
          <div className="space-y-6 animate-in fade-in">
            <AtRiskQueue
              cases={cases}
              onSelectCase={handleSelectCaseFromQueue}
              onApproveHumanAction={handleApproveHumanAction}
            />
          </div>
        )}

        {activeTab === 'report' && (
          <div className="space-y-6 animate-in fade-in">
            <SystemReportPanel
              stats={stats}
              sensitivity={sensitivity}
              killSwitchActive={killSwitchActive}
              dryRunActive={dryRunActive}
              mockedClockTime={mockedClockTime}
            />
          </div>
        )}

        {activeTab === 'custom_webhook' && (
          <div className="space-y-6 animate-in fade-in">
            <CustomWebhookBuilder
              onProcessWebhook={handleTriggerEvent as any}
              onInspectCase={handleInspectCase}
            />
            <RestraintShowcase />
          </div>
        )}

        {activeTab === 'acceptance' && (
          <div className="space-y-6 animate-in fade-in">
            <AcceptanceCriteriaPanel />
          </div>
        )}

        {activeTab === 'receivables' && (
          <div className="space-y-6 animate-in fade-in">
            <B2BReceivablesPanel />
          </div>
        )}
      </main>

      {/* Case Lifecycle Telemetry Drilldown Modal */}
      {selectedAudit && (
        <CaseTimelineModal
          auditEntry={selectedAudit}
          subCase={selectedCase}
          onClose={() => {
            setSelectedAudit(null);
            setSelectedCase(null);
          }}
          onSimulatePayment={handleSimulatePayment}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-stone-700/60 py-5 text-xs font-mono text-stone-500">
        <div className="max-w-[1480px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 lg:px-8">
          <span>REVRECOVER / CARDS-ONLY RECOVERY PROTOTYPE</span>
          <span>SIMULATED RESULTS ARE EXPLICITLY LABELED</span>
        </div>
      </footer>
    </div>
  );
}
