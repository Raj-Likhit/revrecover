import React, { useState } from 'react';
import { 
  Code, 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Zap, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { AuditLogEntry, ReasonBucket, ArmType } from '../types/revrecover.js';

interface CustomWebhookBuilderProps {
  onProcessWebhook: (payload: Record<string, unknown>) => Promise<AuditLogEntry | null>;
  onInspectCase: (audit: AuditLogEntry) => void;
}

export const CustomWebhookBuilder: React.FC<CustomWebhookBuilderProps> = ({
  onProcessWebhook,
  onInspectCase,
}) => {
  const [eventType, setEventType] = useState<'subscription.pending' | 'subscription.halted' | 'subscription.charged' | 'payment.captured'>('subscription.pending');
  const [customerName, setCustomerName] = useState('Vikram Malhotra');
  const [phoneMasked, setPhoneMasked] = useState('+91 98110****9876');
  const [planName, setPlanName] = useState('Pro Monthly');
  const [amountRupees, setAmountRupees] = useState(2999);
  const [reasonBucket, setReasonBucket] = useState<ReasonBucket>('insufficient_funds');
  const [errorSource, setErrorSource] = useState<'customer' | 'issuer' | 'gateway' | 'business'>('customer');
  const [authAttempts, setAuthAttempts] = useState(1);
  const [arm, setArm] = useState<ArmType>('treatment');
  const [customJson, setCustomJson] = useState('');
  const [isRawJsonMode, setIsRawJsonMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AuditLogEntry | null>(null);

  const handleSend = async () => {
    setIsLoading(true);
    try {
      let payload: Record<string, unknown>;
      if (isRawJsonMode) {
        payload = JSON.parse(customJson) as Record<string, unknown>;
      } else {
        const errorReasonMap: Record<ReasonBucket, string> = {
          insufficient_funds: 'insufficient_funds',
          technical_decline: 'bank_not_available',
          mandate_expired: 'card_expired',
          afa_required: 'authentication_required',
          unknown_decline: 'card_declined',
        };

        payload = {
          event_id: `evt_custom_${Date.now()}`,
          event_type: eventType,
          subscription_id: `sub_custom_${Date.now().toString().slice(-6)}`,
          customer_name: customerName,
          customer_phone_masked: phoneMasked,
          customer_email_masked: `${customerName.toLowerCase().replace(/\s+/g, '')}***@example.com`,
          plan_name: planName,
          amount_paise: amountRupees * 100,
          error_reason: errorReasonMap[reasonBucket],
          error_source: errorSource,
          error_code: 'BAD_REQUEST_ERROR',
          auth_attempts: authAttempts,
          arm,
          result_label: 'observed_test',
        };
      }

      const res = await fetch('/api/webhook/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.auditEntry) {
        setResult(data.auditEntry);
      }
    } catch (err) {
      console.error('Webhook dispatch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase">
              Interactive Webhook Ingestion
            </span>
            <span className="text-xs text-stone-400 font-mono">
              Live Razorpay Endpoint Tester
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-100 mt-1">
            Custom Webhook Dispatcher &amp; Sandbox
          </h2>
          <p className="text-xs text-stone-400">
            Construct custom failed payment webhooks, test arbitrary edge cases (e.g. ₹15,001 AFA boundary, expired cards, T+3 transitions), and observe real-time policy evaluation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRawJsonMode(!isRawJsonMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition ${
              isRawJsonMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            {isRawJsonMode ? 'Form Mode' : 'Raw JSON Mode'}
          </button>
        </div>
      </div>

      {isRawJsonMode ? (
        <div className="space-y-3">
          <textarea
            value={customJson}
            onChange={(e) => setCustomJson(e.target.value)}
            rows={10}
            placeholder={`{\n  "event_id": "evt_live_test_01",\n  "event_type": "subscription.pending",\n  "subscription_id": "sub_test_001",\n  "customer_name": "Rohan Gupta",\n  "amount_paise": 1850000,\n  "error_reason": "authentication_required",\n  "error_source": "customer",\n  "arm": "treatment"\n}`}
            className="w-full p-4 rounded-xl bg-stone-950 border border-stone-800 text-xs font-mono text-stone-200 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
          {/* Event Type */}
          <div className="space-y-1">
            <label className="text-stone-400 text-[10px]">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as any)}
              className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
            >
              <option value="subscription.pending">subscription.pending (T=0..T+2)</option>
              <option value="subscription.halted">subscription.halted (T+3)</option>
              <option value="subscription.charged">subscription.charged (Success)</option>
              <option value="payment.captured">payment.captured (Success)</option>
            </select>
          </div>

          {/* Customer Name */}
          <div className="space-y-1">
            <label className="text-stone-400 text-[10px]">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
            />
          </div>

          {/* Amount in Rupees */}
          <div className="space-y-1">
            <label className="text-stone-400 text-[10px]">Amount (₹)</label>
            <input
              type="number"
              value={amountRupees}
              onChange={(e) => setAmountRupees(Number(e.target.value))}
              className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-amber-300 font-bold focus:outline-none"
            />
          </div>

          {/* Failure Bucket */}
          <div className="space-y-1">
            <label className="text-stone-400 text-[10px]">Failure Reason</label>
            <select
              value={reasonBucket}
              onChange={(e) => setReasonBucket(e.target.value as any)}
              className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
            >
              <option value="insufficient_funds">Insufficient Funds (Soft)</option>
              <option value="technical_decline">Technical Timeout (Soft)</option>
              <option value="mandate_expired">Card Expired (Hard Token)</option>
              <option value="afa_required">AFA Required (&gt; ₹15,000)</option>
              <option value="unknown_decline">Unknown / Bank Decline</option>
            </select>
          </div>

          {/* Arm */}
          <div className="space-y-1">
            <label className="text-stone-400 text-[10px]">Experiment Arm</label>
            <select
              value={arm}
              onChange={(e) => setArm(e.target.value as any)}
              className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
            >
              <option value="treatment">Treatment (Active Agent)</option>
              <option value="control">Control (20% Holdout)</option>
            </select>
          </div>

          {/* Auth Attempts */}
          <div className="space-y-1">
            <label className="text-stone-400 text-[10px]">Retry Attempt #</label>
            <select
              value={authAttempts}
              onChange={(e) => setAuthAttempts(Number(e.target.value))}
              className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
            >
              <option value={1}>Attempt 1 (T=0)</option>
              <option value={2}>Attempt 2 (T+1)</option>
              <option value={3}>Attempt 3 (T+2)</option>
              <option value={4}>Attempt 4 (T+3 Halted)</option>
            </select>
          </div>

          {/* Error Source */}
          <div className="space-y-1">
            <label className="text-stone-400 text-[10px]">Error Source</label>
            <select
              value={errorSource}
              onChange={(e) => setErrorSource(e.target.value as any)}
              className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none"
            >
              <option value="customer">customer</option>
              <option value="issuer">issuer (bank)</option>
              <option value="gateway">gateway</option>
              <option value="business">business</option>
            </select>
          </div>

          {/* Dispatch Button */}
          <div className="flex items-end">
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="w-full p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Dispatch Webhook
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-stone-950 p-4 rounded-xl border border-amber-500/30 space-y-3 font-mono text-xs"
        >
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-stone-100 font-bold">Webhook Processed Successfully</span>
            </div>
            <span className="text-[10px] text-stone-400">Idempotency Key: {result.idempotency_key}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-stone-900 p-2 rounded border border-stone-800">
              <span className="text-stone-500 block text-[10px]">Decision:</span>
              <span className="text-cyan-300 font-bold">{result.policy_decision}</span>
            </div>
            <div className="bg-stone-900 p-2 rounded border border-stone-800">
              <span className="text-stone-500 block text-[10px]">Net EV:</span>
              <span className="text-emerald-400 font-bold">₹{(result.net_ev_paise / 100).toFixed(2)}</span>
            </div>
            <div className="bg-stone-900 p-2 rounded border border-stone-800">
              <span className="text-stone-500 block text-[10px]">AFA Required:</span>
              <span className="text-purple-300 font-bold">{result.compliance_checks.afa_basis}</span>
            </div>
            <div className="bg-stone-900 p-2 rounded border border-stone-800">
              <span className="text-stone-500 block text-[10px]">Outcome:</span>
              <span className="text-amber-300 font-bold uppercase">{result.outcome}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-stone-400 text-[11px] font-sans italic">
              "{result.human_readable_explanation}"
            </p>
            <button
              onClick={() => onInspectCase(result)}
              className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded text-xs transition flex items-center gap-1 shrink-0"
            >
              Inspect Telemetry <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
