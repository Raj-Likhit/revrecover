import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  IndianRupee, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  FileText,
  Percent
} from 'lucide-react';
import { B2BInvoiceCase } from '../types/revrecover.js';

export const B2BReceivablesPanel: React.FC = () => {
  const [data, setData] = useState<{
    total_invoices: number;
    total_outstanding_paise: number;
    total_recovered_paise: number;
    interest_saved_paise: number;
    invoices: B2BInvoiceCase[];
  } | null>(null);

  useEffect(() => {
    fetch('/api/receivables')
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error('Receivables error:', err));
  }, []);

  if (!data) {
    return (
      <div className="py-12 text-center text-stone-500 text-xs font-mono">
        Loading B2B receivables data...
      </div>
    );
  }

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase">
              Stretch Engine Module
            </span>
            <span className="text-xs text-stone-400 font-mono">
              B2B Accounts Receivable Dunning
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-100 mt-1">
            B2B Receivables &amp; Working Capital Optimization
          </h2>
          <p className="text-xs text-stone-400">
            Reusing the deterministic state machine by swapping <code className="text-amber-300 font-mono">invoice_overdue_days</code> for subscription triggers to recover high-value trade receivables.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
          <div className="text-stone-400 text-xs">Total Outstanding Invoices</div>
          <div className="text-2xl font-bold text-stone-200 mt-1">
            ₹{(data.total_outstanding_paise / 100).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">{data.total_invoices} active invoices</div>
        </div>

        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
          <div className="text-stone-400 text-xs">Recovered via Dynamic Dunning</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            ₹{(data.total_recovered_paise / 100).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">Virtual Account NEFT/RTGS</div>
        </div>

        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
          <div className="text-stone-400 text-xs">Working Capital Interest Saved</div>
          <div className="text-2xl font-bold text-cyan-300 mt-1">
            ₹{(data.interest_saved_paise / 100).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">@ 14% p.a. Cost of Capital</div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-x-auto border border-stone-800 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-950/80 text-stone-400 font-mono uppercase text-[10px] border-b border-stone-800">
            <tr>
              <th className="py-3 px-4">Invoice / Company</th>
              <th className="py-3 px-4">Amount (₹)</th>
              <th className="py-3 px-4">Overdue Aging</th>
              <th className="py-3 px-4">Recovery Action</th>
              <th className="py-3 px-4">Interest Saved</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/80">
            {data.invoices.map((inv) => (
              <tr key={inv.invoice_id} className="hover:bg-stone-800/40 transition">
                <td className="py-3 px-4">
                  <div className="font-bold text-stone-200">{inv.company_name}</div>
                  <div className="text-[10px] text-stone-500 font-mono">
                    {inv.invoice_id} • {inv.customer_name}
                  </div>
                </td>

                <td className="py-3 px-4 font-mono font-bold text-stone-200">
                  ₹{(inv.amount_paise / 100).toLocaleString('en-IN')}
                </td>

                <td className="py-3 px-4 font-mono">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    inv.aging_bucket === '1-15d'
                      ? 'bg-amber-500/10 text-amber-300'
                      : inv.aging_bucket === '16-30d'
                      ? 'bg-orange-500/10 text-orange-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {inv.overdue_days} Days ({inv.aging_bucket})
                  </span>
                </td>

                <td className="py-3 px-4 text-stone-300 text-[11px]">
                  {inv.recovery_action}
                </td>

                <td className="py-3 px-4 font-mono text-cyan-300">
                  ₹{(inv.working_capital_interest_saved_paise / 100).toLocaleString('en-IN')}
                </td>

                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                    inv.status === 'settled_with_discount'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : inv.status === 'unpaid'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {inv.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
