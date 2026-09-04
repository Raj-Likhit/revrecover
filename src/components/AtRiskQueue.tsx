import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  XCircle,
  PauseCircle,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { SubscriptionCase, ReasonBucket, ArmType } from '../types/revrecover.js';

interface AtRiskQueueProps {
  cases: SubscriptionCase[];
  onSelectCase: (subCase: SubscriptionCase) => void;
  onApproveHumanAction: (subscriptionId: string) => void;
}

export const AtRiskQueue: React.FC<AtRiskQueueProps> = ({
  cases,
  onSelectCase,
  onApproveHumanAction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [selectedArm, setSelectedArm] = useState<string>('all');

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subscription_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.plan_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBucket = selectedBucket === 'all' || c.reason_bucket === selectedBucket;
    const matchesArm = selectedArm === 'all' || c.arm === selectedArm;

    return matchesSearch && matchesBucket && matchesArm;
  });

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase">
              Active Case Monitor
            </span>
            <span className="text-xs text-stone-400 font-mono">
              {filteredCases.length} of {cases.length} subscriptions
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-100 mt-1">
            At-Risk e-Mandate Subscription Queue
          </h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, ID, plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Reason Bucket Filter */}
          <select
            value={selectedBucket}
            onChange={(e) => setSelectedBucket(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-300 focus:outline-none focus:border-amber-500/50 font-mono"
          >
            <option value="all">All Buckets</option>
            <option value="insufficient_funds">Insufficient Funds (Soft)</option>
            <option value="technical_decline">Technical Decline (Soft)</option>
            <option value="mandate_expired">Mandate Expired (Hard)</option>
            <option value="afa_required">AFA Required (&gt; ₹15k)</option>
            <option value="unknown_decline">Unknown Decline</option>
          </select>

          {/* Arm Filter */}
          <select
            value={selectedArm}
            onChange={(e) => setSelectedArm(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-300 focus:outline-none focus:border-amber-500/50 font-mono"
          >
            <option value="all">All Arms</option>
            <option value="treatment">Treatment Arm</option>
            <option value="control">Control (Holdout)</option>
          </select>
        </div>
      </div>

      {/* Table of Cases */}
      <div className="overflow-x-auto border border-stone-800 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-950/80 text-stone-400 font-mono uppercase text-[10px] border-b border-stone-800">
            <tr>
              <th className="py-3 px-4">Subscription / Customer</th>
              <th className="py-3 px-4">Arm / Status</th>
              <th className="py-3 px-4">Diagnosis Bucket</th>
              <th className="py-3 px-4">Amount (₹)</th>
              <th className="py-3 px-4">Stage / Ladder</th>
              <th className="py-3 px-4">Outcome</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/80 font-sans">
            {filteredCases.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-500 font-mono">
                  No cases match the selected filters.
                </td>
              </tr>
            ) : (
              filteredCases.map((c) => {
                const isPaid = c.invoice_paid;
                const isHalted = c.status === 'halted';

                return (
                  <tr
                    key={c.subscription_id}
                    className="hover:bg-stone-800/40 transition group cursor-pointer"
                    onClick={() => onSelectCase(c)}
                  >
                    {/* Customer & ID */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-200 group-hover:text-amber-300 transition">
                        {c.customer_name}
                      </div>
                      <div className="text-[10px] font-mono text-stone-500 flex items-center gap-1.5">
                        <span>{c.subscription_id}</span>
                        <span>•</span>
                        <span className="text-stone-400">{c.plan_name}</span>
                      </div>
                    </td>

                    {/* Arm & Status */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            c.arm === 'treatment'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              : 'bg-stone-800 text-stone-400 border-stone-700'
                          }`}
                        >
                          {c.arm.toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                            isPaid
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : isHalted
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                    </td>

                    {/* Diagnosis Bucket */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] text-stone-300 block">
                        {c.reason_bucket}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        source: {c.error_source}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 font-mono font-bold text-stone-200">
                      ₹{(c.amount_paise / 100).toLocaleString('en-IN')}
                    </td>

                    {/* Stage */}
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-400">
                      {c.current_stage}
                    </td>

                    {/* Outcome */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          c.outcome === 'direct'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : c.outcome === 'assisted'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : c.outcome === 'recovered_by_autopay'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : c.outcome === 'stopped'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {c.outcome}
                      </span>
                      {c.mandate_restored && (
                        <span className="block text-[9px] text-emerald-400 font-mono mt-0.5">
                          ✓ Mandate Restored
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {c.needs_human_approval && (
                          <button
                            onClick={() => onApproveHumanAction(c.subscription_id)}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[10px] rounded transition shadow-sm"
                            title={c.human_approval_reason}
                          >
                            Approve Action
                          </button>
                        )}
                        <button
                          onClick={() => onSelectCase(c)}
                          className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] transition flex items-center gap-1"
                        >
                          Drilldown <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
