import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, BarChart2, PieChart, Layers } from 'lucide-react';
import { EngineStats, SensitivityScenario } from '../types/revrecover.js';

interface ExecutiveLiftChartsProps {
  stats: EngineStats;
  sensitivity?: SensitivityScenario[];
}

export const ExecutiveLiftCharts: React.FC<ExecutiveLiftChartsProps> = ({
  stats,
  sensitivity = [],
}) => {
  // Lift trajectory over dunning cycle (T=0 to T+14)
  const trajectoryData = [
    { stage: 'T=0 (Pending)', control: 15, treatment: 15, lift: 0, note: 'Restraint on soft decline' },
    { stage: 'T+1 (Retry 1)', control: 25, treatment: 27, lift: 2, note: 'Organic retries active' },
    { stage: 'T+2 (Retry 2)', control: 31, treatment: 36, lift: 5, note: 'Card updates converting' },
    { stage: 'T+3 (Halted)', control: 32, treatment: 52, lift: 20, note: 'Agent fires payment links' },
    { stage: 'T+7 (Grace)', control: 32, treatment: 59, lift: 27, note: 'Late-fee waivers applied' },
    { stage: 'T+14 (Final)', control: 32, treatment: Math.round(stats.treatment_recovery_rate * 100) || 62, lift: Math.round(stats.lift_rate * 100) || 30, note: 'Final lift achieved' },
  ];

  // Bucket attribution and Net EV data
  const bucketBreakdown = [
    { name: 'Insufficient Funds', base: 45, treated: 62, lift: 17, ev: '₹254 avg', color: '#06b6d4' },
    { name: 'Technical Timeout', base: 50, treated: 65, lift: 15, ev: '₹224 avg', color: '#38bdf8' },
    { name: 'Mandate Expired', base: 5, treated: 30, lift: 25, ev: '₹1,742 MRR', color: '#f59e0b' },
    { name: 'AFA (> ₹15k)', base: 15, treated: 45, lift: 30, ev: '₹5,550 avg', color: '#a855f7' },
    { name: 'Unknown / Generic', base: 30, treated: 42, lift: 12, ev: '₹359 avg', color: '#eab308' },
  ];

  const sensitivityData = sensitivity.map((s) => ({
    name: s.label.split(' ')[0],
    multiplier: `${s.multiplier}x`,
    recoveryRate: parseFloat((s.treatment_recovery_rate * 100).toFixed(1)),
    controlRate: parseFloat((s.control_recovery_rate * 100).toFixed(1)),
    netAttributableRupees: Math.round(s.net_attributable_paise / 100),
    mrrPreservedRupees: Math.round(s.mrr_preserved_paise / 100),
    roi: s.roi_multiple,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Cumulative Lift Trajectory */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-100">Cumulative Recovery Lift Trajectory</h3>
              <p className="text-[11px] text-stone-400">Treatment Arm (80%) vs Control Arm (20% Holdout) over Retry Timeline</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            +{((stats.treatment_recovery_rate - stats.control_recovery_rate) * 100).toFixed(1)}% Max Lift
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="treatmentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="controlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#78716c" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#78716c" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
              <XAxis dataKey="stage" stroke="#78716c" fontSize={10} tickLine={false} />
              <YAxis stroke="#78716c" fontSize={10} tickLine={false} tickFormatter={(val) => `${val}%`} domain={[0, 70]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0c0a09', borderColor: '#292524', borderRadius: '12px', fontSize: '11px', color: '#e7e5e4' }}
                formatter={(value: number | string, name: string) => [`${value}%`, name === 'treatment' ? 'Treatment Arm' : 'Control Arm']}
              />
              <Area type="monotone" dataKey="treatment" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#treatmentGrad)" name="treatment" />
              <Area type="monotone" dataKey="control" stroke="#78716c" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#controlGrad)" name="control" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 bg-stone-950 p-2.5 rounded-xl border border-stone-800">
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2.5 h-1 bg-amber-400 rounded-full" /> Treatment (Agent + Retries)
          </span>
          <span className="flex items-center gap-1.5 text-stone-400">
            <span className="w-2.5 h-1 bg-stone-500 rounded-full" /> Control (Pure Organic Retries)
          </span>
          <span className="text-emerald-400 font-bold">P-Value = {stats.p_value}</span>
        </div>
      </motion.div>

      {/* Chart 2: Lift by Reason Bucket */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-100">Recovery Lift by Failure Archetype</h3>
              <p className="text-[11px] text-stone-400">Baseline Organic (p_base) vs Active Agent (p_treated)</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            5 Failure Buckets
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bucketBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
              <XAxis dataKey="name" stroke="#78716c" fontSize={10} tickLine={false} tickFormatter={(name) => name.split(' ')[0]} />
              <YAxis stroke="#78716c" fontSize={10} tickLine={false} tickFormatter={(val) => `${val}%`} domain={[0, 80]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0c0a09', borderColor: '#292524', borderRadius: '12px', fontSize: '11px', color: '#e7e5e4' }}
                formatter={(value: number | string, name: string) => [`${value}%`, name === 'treated' ? 'Agent Recovery' : 'Organic Baseline']}
              />
              <Bar dataKey="base" fill="#44403c" name="base" radius={[4, 4, 0, 0]} />
              <Bar dataKey="treated" fill="#06b6d4" name="treated" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
          {bucketBreakdown.map((b) => (
            <div key={b.name} className="bg-stone-950 p-1.5 rounded-lg border border-stone-800">
              <div className="text-stone-400 truncate">{b.name.split(' ')[0]}</div>
              <div className="text-emerald-400 font-bold mt-0.5">+{b.lift}%</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
