import React from 'react';
import { Power, RotateCw, TestTube2 } from 'lucide-react';

interface HeaderProps {
  killSwitchActive: boolean;
  dryRunActive: boolean;
  mockedClockTime: number;
  onToggleKillSwitch: () => void;
  onToggleDryRun: () => void;
  onAdvanceClock: (hours: number) => void;
  onRefreshState: () => void;
  isInsideQuietHours: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const tabs = [
  ['simple-start', '🏠 Start Here'],
  ['audit', '📋 Audit Trail'],
  ['simulator', '📊 Batch Results'],
  ['trigger', '🎯 Test Scenarios'],
  ['compliance', '✓ Compliance'],
  ['dashboard', 'Advanced View'],
  ['cases', 'Case Queue'],
  ['report', 'System Report'],
  ['acceptance', 'Test Suite'],
  ['custom_webhook', 'Webhook Lab'],
  ['receivables', 'B2B Receivables'],
];

export const Header: React.FC<HeaderProps> = (props) => {
  const time = new Date(props.mockedClockTime * 1000).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });

  return <header className="sticky top-0 z-40 border-b border-stone-700/70 bg-[#151717]/95 backdrop-blur-xl">
    <div className="mx-auto flex max-w-[1480px] flex-col gap-5 px-4 py-4 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <svg className="mt-1 h-9 w-9 shrink-0" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M2 2h32v32H2z" stroke="#e6dfd0" strokeWidth="1"/><path d="M9 25V11h11" stroke="#c5532d" strokeWidth="3"/><path d="m16 18 5-5 6 6" stroke="#e6dfd0" strokeWidth="2"/><circle cx="27" cy="19" r="3" fill="#c5532d"/>
          </svg>
          <div><div className="rr-kicker text-[#c5532d]">Revenue recovery / operational control</div><h1 className="rr-display mt-1 text-3xl leading-none text-[#f3f0e8] sm:text-4xl">RevRecover</h1></div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          <span className="border border-stone-700 px-2 py-1 font-mono text-stone-400">{time} IST</span>
          <span className={`border px-2 py-1 font-mono ${props.isInsideQuietHours ? 'border-emerald-900 text-emerald-400' : 'border-[#c5532d] text-[#e6865c]'}`}>{props.isInsideQuietHours ? 'SEND WINDOW OPEN' : 'OUTBOUND QUEUED'}</span>
          <button onClick={() => props.onAdvanceClock(24)} className="border border-stone-700 px-2 py-1 text-stone-300 hover:border-stone-400">+24H</button>
          <button onClick={props.onToggleDryRun} className={`flex items-center gap-1 border px-2 py-1 ${props.dryRunActive ? 'border-amber-400 text-amber-300' : 'border-stone-700 text-stone-400'}`}><TestTube2 size={13}/>DRY {props.dryRunActive ? 'ON' : 'OFF'}</button>
          <button onClick={props.onToggleKillSwitch} className={`flex items-center gap-1 border px-2 py-1 ${props.killSwitchActive ? 'border-red-400 bg-red-950 text-red-200' : 'border-stone-700 text-stone-300'}`}><Power size={13}/>{props.killSwitchActive ? 'HALTED' : 'STOP'}</button>
          <button onClick={props.onRefreshState} aria-label="Refresh state" className="border border-stone-700 p-1 text-stone-300"><RotateCw size={14}/></button>
        </div>
      </div>
      <nav className="flex overflow-x-auto border-y border-stone-700/70 bg-[#1a1d1d]">
        {tabs.map(([id, label]) => <button key={id} data-active={props.activeTab === id} onClick={() => props.setActiveTab(id)} className="rr-tab shrink-0 px-3 py-2 text-xs font-medium text-stone-400 hover:text-stone-100 data-[active=true]:text-amber-400 data-[active=true]:border-b-2 data-[active=true]:border-amber-400 sm:px-4 whitespace-nowrap">{label}</button>)}
      </nav>
    </div>
  </header>;
};
