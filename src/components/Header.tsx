import React from 'react';

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
  ['simple-start', 'Start Here'],
  ['audit', 'Audit Trail'],
  ['simulator', 'Batch Results'],
  ['trigger', 'Test Scenarios'],
  ['compliance', 'Compliance'],
  ['dashboard', 'Dashboard'],
];

export const Header: React.FC<HeaderProps> = (props) => {
  const time = new Date(props.mockedClockTime * 1000).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });

  return <header className="sticky top-0 z-40 border-b border-white/10 bg-stone-900/40 backdrop-blur-2xl shadow-lg shadow-black/20">
    <div className="mx-auto flex max-w-[1480px] flex-col gap-5 px-4 py-4 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <svg className="mt-1 h-9 w-9 shrink-0" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M2 2h32v32H2z" stroke="#e6dfd0" strokeWidth="1"/><path d="M9 25V11h11" stroke="#c5532d" strokeWidth="3"/><path d="m16 18 5-5 6 6" stroke="#e6dfd0" strokeWidth="2"/><circle cx="27" cy="19" r="3" fill="#c5532d"/>
          </svg>
          <div><div className="rr-kicker text-[#c5532d]">Revenue recovery / operational control</div><h1 className="rr-display mt-1 text-3xl leading-none text-[#f3f0e8] sm:text-4xl">RevRecover</h1></div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          <span className="bg-white/5 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-lg font-mono text-stone-300 shadow-sm">{time} IST</span>
          <span className={`backdrop-blur-sm border px-3 py-1.5 rounded-lg font-mono shadow-sm ${props.isInsideQuietHours ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-orange-500/10 border-orange-500/30 text-orange-300'}`}>{props.isInsideQuietHours ? 'SEND WINDOW OPEN' : 'OUTBOUND QUEUED'}</span>
          <button onClick={() => props.onAdvanceClock(24)} className="bg-white/5 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-lg text-stone-300 hover:bg-white/10 hover:border-white/20 transition-all shadow-sm">+24H</button>
          <button onClick={props.onToggleDryRun} className={`backdrop-blur-sm border px-3 py-1.5 rounded-lg transition-all shadow-sm ${props.dryRunActive ? 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25' : 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10'}`}>DRY {props.dryRunActive ? 'ON' : 'OFF'}</button>
          <button onClick={props.onToggleKillSwitch} className={`backdrop-blur-sm border px-3 py-1.5 rounded-lg transition-all shadow-sm ${props.killSwitchActive ? 'bg-red-500/20 border-red-400/40 text-red-200 hover:bg-red-500/30' : 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10'}`}>{props.killSwitchActive ? 'HALTED' : 'STOP'}</button>
          <button onClick={props.onRefreshState} aria-label="Refresh state" className="bg-white/5 backdrop-blur-sm border border-white/10 px-2 py-1.5 rounded-lg text-stone-300 hover:bg-white/10 hover:border-white/20 transition-all shadow-sm">↻</button>
        </div>
      </div>
      <nav className="flex overflow-x-auto border border-white/10 bg-white/5 backdrop-blur-sm rounded-xl shadow-sm">
        {tabs.map(([id, label]) => <button key={id} data-active={props.activeTab === id} onClick={() => props.setActiveTab(id)} className="shrink-0 px-4 py-2.5 text-xs font-semibold text-stone-400 hover:text-stone-100 hover:bg-white/5 transition-all data-[active=true]:bg-gradient-to-br data-[active=true]:from-amber-500/20 data-[active=true]:to-orange-500/20 data-[active=true]:text-amber-300 data-[active=true]:border-b-2 data-[active=true]:border-amber-400 whitespace-nowrap first:rounded-l-xl last:rounded-r-xl">{label}</button>)}
      </nav>
    </div>
  </header>;
};
