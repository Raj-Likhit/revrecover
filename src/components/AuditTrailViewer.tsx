import React, { useState } from 'react';
import { 
  FileText, 
  Code, 
  Search, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  ShieldCheck, 
  Layers 
} from 'lucide-react';
import { AuditLogEntry } from '../types/revrecover.js';

interface AuditTrailViewerProps {
  logs: AuditLogEntry[];
  onSelectAudit: (entry: AuditLogEntry) => void;
}

export const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({
  logs,
  onSelectAudit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredLogs = logs.filter((l) => {
    return (
      l.subscription_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.policy_decision.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.idempotency_key.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
              Deterministic Audit Engine
            </span>
            <span className="text-xs text-stone-400 font-mono">
              Integer Paise &amp; Epoch Seconds
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-100 mt-1">
            Immutable Audit Trail &amp; Decision Log
          </h2>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sub ID, policy, idempotency..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Log Entries List */}
      <div className="space-y-3 font-mono">
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-stone-500 text-xs font-mono">
            No audit records match the search filter.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            const dateStr = new Date(log.timestamp * 1000).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={log.id}
                className="bg-stone-950 border border-stone-800 hover:border-stone-700 rounded-xl overflow-hidden transition"
              >
                {/* Log Header Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-stone-900/50 transition text-xs"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-amber-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-stone-500" />
                    )}
                    <span className="text-stone-400 text-[11px]">{dateStr} IST</span>
                    <span className="text-stone-200 font-bold">{log.subscription_id}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      log.arm === 'treatment' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-stone-800 text-stone-400 border-stone-700'
                    }`}>
                      {log.arm.toUpperCase()}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">
                      {log.result_label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-stone-300">
                      ₹{(log.amount_paise / 100).toLocaleString('en-IN')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      log.policy_decision === 'wait_for_autopay'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : log.policy_decision === 'send_card_update_link'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : log.policy_decision === 'stop'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {log.policy_decision}
                    </span>
                    <span className="text-stone-500 text-[11px] hidden md:inline">
                      Net EV: ₹{(log.net_ev_paise / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Expanded Details / JSON Payload */}
                {isExpanded && (
                  <div className="p-4 border-t border-stone-800/80 bg-stone-900/40 space-y-3 text-xs">
                    <div className="flex items-center justify-between text-stone-400">
                      <span>Human-Readable Explanation:</span>
                      <button
                        onClick={() => handleCopy(log.id, JSON.stringify(log, null, 2))}
                        className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] rounded flex items-center gap-1 transition"
                      >
                        {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy Full JSON
                      </button>
                    </div>
                    <p className="text-stone-200 bg-stone-950 p-2.5 rounded-lg border border-stone-800 font-sans">
                      {log.human_readable_explanation}
                    </p>

                    <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 overflow-x-auto text-[11px] text-stone-300 max-h-72">
                      <pre>{JSON.stringify(log, null, 2)}</pre>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onSelectAudit(log)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded text-xs transition"
                      >
                        Inspect Telemetry &amp; WhatsApp Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
