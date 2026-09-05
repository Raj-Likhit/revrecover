import express from 'express';
import path from 'path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { globalEngine, BENCHMARK_MATRIX, operationalDb } from './server/engine.js';
import { generateAndRunSyntheticBatch, computeSensitivityBands } from './server/synthetic.js';
import { globalReceivablesEngine } from './server/receivables.js';
import { runAcceptanceVerificationSuite } from './server/acceptance.js';
import { cacheHits, cacheMisses } from './server/gemini.js';
import { startDispatchQueue } from './queue/dispatchQueue.js';
import { createPaymentLink, getCardUpdateCheckoutUrl } from './providers/razorpayProvider.js';
import { rankAndAllocate, budgetAllocationLabel } from './policy/budgetAllocator.js';
import { saveExperimentRun } from './db/experimentRuns.js';
import { logger } from './server/logger.js';
import { validateWebhookEvent, validateNonEmptyString, ValidationError } from './server/validation.js';
import { 
  DEFAULT_PORT, 
  SERVER_HOST, 
  DEFAULT_BATCH_SIZE, 
  DEFAULT_SEED,
  DEFAULT_CASES_LIMIT,
  DEFAULT_AUDIT_LOGS_LIMIT,
  MAX_AUDIT_LOGS_LIMIT,
} from './server/constants.js';
import type { ScoredCase } from './types.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;

  app.use(express.json({ verify: (req, _res, buffer) => { (req as express.Request & { rawBody?: Buffer }).rawBody = buffer; } }));

  // Initialize initial synthetic batch on startup
  if (globalEngine.cases.size === 0) {
    logger.info('Bootstrapping initial synthetic batch', { 
      seed: DEFAULT_SEED, 
      count: DEFAULT_BATCH_SIZE 
    });
    await generateAndRunSyntheticBatch(globalEngine, DEFAULT_BATCH_SIZE, DEFAULT_SEED);
    logger.info('Initial batch loaded successfully');
  } else {
    logger.info('Restored persisted cases', { count: globalEngine.cases.size });
  }

  // Deferred quiet-hour actions use the same provider calls as immediate actions.
  // The worker is deliberately process-local for this single-instance demo.
  startDispatchQueue({
    db: operationalDb,
    isKillSwitchActive: () => globalEngine.killSwitchActive,
    isDryRunActive: () => globalEngine.dryRunActive,
    dispatchFn: async (row) => {
      const subCase = globalEngine.cases.get(row.subscription_id);
      if (!subCase) throw new Error(`Case ${row.subscription_id} is no longer available for dispatch`);
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return { provider: 'simulator', providerRefId: `sim:${row.id}`, hostedUrl: `https://rzp.io/i/queued-${row.id}` };
      }
      const result = row.action_type === 'send_card_update_link'
        ? await getCardUpdateCheckoutUrl({ subscriptionId: subCase.subscription_id })
        : await createPaymentLink({
            subscriptionId: subCase.subscription_id,
            ladderStage: row.ladder_stage,
            amountPaise: subCase.amount_paise,
            customerName: subCase.customer_name.split(' ')[0],
            description: `Outstanding ${subCase.plan_name} subscription payment`,
          });
      if (result.ok === false) throw new Error(result.error);
      return { provider: result.provider, providerRefId: result.providerRefId, hostedUrl: result.hostedUrl };
    },
  });

  // ==========================================
  // API ROUTES (Mounted FIRST before Vite middleware)
  // ==========================================

  // 1. Current State & Dashboard Summary
  app.get('/api/state', (req, res) => {
    const stats = globalEngine.calculateStats();
    stats.archetype_cache_hits = cacheHits;
    stats.archetype_cache_misses = cacheMisses;

    const cases = Array.from(globalEngine.cases.values());
    const sensitivity = computeSensitivityBands(stats);

    res.json({
      status: 'ok',
      kill_switch_active: globalEngine.killSwitchActive,
      dry_run_active: globalEngine.dryRunActive,
      mocked_clock_time: globalEngine.mockedClockTime,
      stats,
      benchmarks: BENCHMARK_MATRIX,
      sensitivity,
      cases_count: cases.length,
      cases: cases.slice(0, DEFAULT_CASES_LIMIT),
      recent_audit_logs: globalEngine.auditLogs.slice(0, DEFAULT_AUDIT_LOGS_LIMIT),
    });
  });

  // 2. Filterable Audit Logs
  app.get('/api/audit-logs', (req, res) => {
    const { arm, bucket, outcome, limit } = req.query;
    let logs = globalEngine.auditLogs;

    if (arm) {
      logs = logs.filter(l => l.arm === arm);
    }
    if (bucket) {
      logs = logs.filter(l => l.reason_bucket === bucket);
    }
    if (outcome) {
      logs = logs.filter(l => l.outcome === outcome);
    }

    const maxLimit = limit ? Math.min(parseInt(limit as string, 10), MAX_AUDIT_LOGS_LIMIT) : MAX_AUDIT_LOGS_LIMIT;
    res.json({
      total: logs.length,
      logs: logs.slice(0, maxLimit),
    });
  });

  // 3. Ingest Real or Test Razorpay Webhook
  app.post('/api/webhook/razorpay', async (req, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (webhookSecret) {
        const signature = req.header('x-razorpay-signature');
        const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
        const expected = rawBody ? crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex') : '';
        if (!signature || !expected || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
          return res.status(401).json({ status: 'error', message: 'Invalid Razorpay webhook signature' });
        }
      }

      // Validate webhook structure
      const { event_id, event_type, subscription_id } = validateWebhookEvent(req.body);
      
      const payload = req.body;
      const razorpaySubscription = payload.payload?.subscription?.entity;
      const razorpayPayment = payload.payload?.payment?.entity;
      
      const result = await globalEngine.processWebhook({
        event_id,
        event_type: event_type as 'subscription.pending' | 'subscription.halted' | 'subscription.charged' | 'payment.failed' | 'payment.captured',
        subscription_id,
        customer_name: payload.customer_name || razorpayPayment?.notes?.customer_name || 'Live Test Customer',
        customer_phone_masked: payload.customer_phone_masked || '+91 98765****0000',
        customer_email_masked: payload.customer_email_masked || 'test***@domain.in',
        plan_name: payload.plan_name || razorpaySubscription?.plan_id || 'Razorpay Subscription',
        amount_paise: payload.amount_paise || razorpayPayment?.amount || 299900,
        error_code: payload.error_code || razorpayPayment?.error_code,
        error_description: payload.error_description || razorpayPayment?.error_description,
        error_source: payload.error_source || razorpayPayment?.error_source,
        error_step: payload.error_step || razorpayPayment?.error_step,
        error_reason: payload.error_reason || razorpayPayment?.error_reason,
        auth_attempts: payload.auth_attempts || razorpayPayment?.notes?.auth_attempts || 1,
        payment_route: payload.payment_route || razorpayPayment?.payment_link_id || razorpayPayment?.notes?.payment_link_id,
        arm: payload.arm || 'treatment',
        result_label: payload.result_label || 'observed_test',
      });

      res.json({ status: 'success', ...result });
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(400).json({ status: 'error', message: err.message, field: err.field });
      }
      logger.error('Webhook processing error', err, { 
        event_type: req.body.event_type,
        subscription_id: req.body.subscription_id 
      });
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      res.status(500).json({ status: 'error', message });
    }
  });

  // 4. Live Trigger Simulation Event (Single scenario for stage demo)
  app.post('/api/trigger/event', async (req, res) => {
    const { scenario } = req.body;
    try {
      if (!scenario || typeof scenario !== 'string') {
        return res.status(400).json({ status: 'error', message: 'scenario is required and must be a string' });
      }
      
      const ts = globalEngine.mockedClockTime;
      const subId = `sub_live_${Date.now().toString().slice(-6)}`;

      let eventData;

      if (scenario === 'soft_decline_restraint') {
        // Soft decline: Proves LEAD WITH RESTRAINT (Wait for Autopay!)
        eventData = {
          event_id: `evt_demo_soft_${Date.now()}`,
          event_type: 'subscription.pending' as const,
          subscription_id: subId,
          customer_name: 'Aditya Verma',
          customer_phone_masked: '+91 98110****5432',
          customer_email_masked: 'aditya***@gmail.com',
          plan_name: 'Growth Monthly (₹1,499)',
          amount_paise: 149900,
          error_reason: 'insufficient_funds',
          error_source: 'customer' as const,
          auth_attempts: 1,
          arm: 'treatment' as const,
          result_label: 'observed_test' as const,
        };
      } else if (scenario === 'hard_decline_card_expired') {
        // Hard decline: Mandate expired -> Autopay will NEVER recover -> Immediate card update link!
        eventData = {
          event_id: `evt_demo_hard_${Date.now()}`,
          event_type: 'subscription.pending' as const,
          subscription_id: subId,
          customer_name: 'Rohan Deshmukh',
          customer_phone_masked: '+91 98220****9876',
          customer_email_masked: 'rohan***@corp.in',
          plan_name: 'Team Enterprise (₹6,969)',
          amount_paise: 696900,
          error_reason: 'card_expired',
          error_source: 'issuer' as const,
          auth_attempts: 1,
          arm: 'treatment' as const,
          result_label: 'observed_test' as const,
        };
      } else if (scenario === 'afa_required_above_15k') {
        // AFA Threshold: ₹18,500 crosses RBI ₹15,000 threshold -> Needs OTP authentication link
        eventData = {
          event_id: `evt_demo_afa_${Date.now()}`,
          event_type: 'subscription.pending' as const,
          subscription_id: subId,
          customer_name: 'Meera Iyer',
          customer_phone_masked: '+91 98330****1122',
          customer_email_masked: 'meera***@firm.in',
          plan_name: 'Dedicated Cluster (₹18,500)',
          amount_paise: 1850000,
          error_reason: 'authentication_required',
          error_source: 'customer' as const,
          auth_attempts: 1,
          arm: 'treatment' as const,
          result_label: 'observed_test' as const,
        };
      } else if (scenario === 'halted_escalation') {
        // Halted: Razorpay gives up at T+3 -> Agent fires payment link immediately!
        eventData = {
          event_id: `evt_demo_halt_${Date.now()}`,
          event_type: 'subscription.halted' as const,
          subscription_id: subId,
          customer_name: 'Pooja Reddy',
          customer_phone_masked: '+91 98440****3344',
          customer_email_masked: 'pooja***@tech.in',
          plan_name: 'Starter Monthly (₹499)',
          amount_paise: 49900,
          error_reason: 'insufficient_funds',
          error_source: 'customer' as const,
          auth_attempts: 4,
          arm: 'treatment' as const,
          result_label: 'observed_test' as const,
        };
      } else {
        // Unknown decline: routes to human queue
        eventData = {
          event_id: `evt_demo_unk_${Date.now()}`,
          event_type: 'subscription.pending' as const,
          subscription_id: subId,
          customer_name: 'Karan Kapoor',
          customer_phone_masked: '+91 98550****7788',
          customer_email_masked: 'karan***@studio.in',
          plan_name: 'Pro Developer Plan (₹2,999)',
          amount_paise: 299900,
          error_reason: 'card_declined',
          error_source: 'issuer' as const,
          auth_attempts: 1,
          arm: 'treatment' as const,
          result_label: 'observed_test' as const,
        };
      }

      const result = await globalEngine.processWebhook(eventData);
      res.json({ status: 'success', scenario, ...result });
    } catch (err) {
      const errorScenario = req.body.scenario || 'unknown';
      logger.error('Trigger event error', err, { scenario: errorScenario });
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      res.status(500).json({ status: 'error', message });
    }
  });

  // 5. Run Synthetic Batch Simulator
  app.post('/api/batch/run', async (req, res) => {
    try {
      const count = req.body.count || DEFAULT_BATCH_SIZE;
      const seed = req.body.seed || Math.floor(Math.random() * 1000000);
      const batchResult = await generateAndRunSyntheticBatch(globalEngine, count, seed);
      const stats = globalEngine.calculateStats();
      const sensitivity = computeSensitivityBands(stats);
      const allocation = rankAndAllocate(
        Array.from(globalEngine.cases.values()).map((c): ScoredCase => {
          const log = c.history[0];
          return {
            subscriptionId: c.subscription_id, customerId: c.customer_id,
            ladderStage: c.current_stage as unknown as ScoredCase['ladderStage'],
            reasonBucket: c.reason_bucket === 'afa_required' ? 'afa_incomplete' : c.reason_bucket,
            decision: log?.policy_decision || 'stop', amountPaise: c.amount_paise,
            pBase: log?.p_base || 0, pTreated: log?.p_treated || 0, liftUsed: log?.lift_used || 0,
            expectedLiftValuePaise: log?.expected_lift_value_paise || 0,
            costPaise: log?.intervention_cost_paise || 0, netEvPaise: log?.net_ev_paise || 0,
            policyVersion: log?.policy_version || 'v5-2026-08-28', arm: c.arm,
            costGuardrailPassed: (log?.intervention_cost_paise || 0) <= c.amount_paise * 0.05,
          };
        }),
        { dailyCapacity: globalEngine.dailyContactCapacity }
      );
      const allocationBySubscription = new Map(allocation.map((item) => [item.case.subscriptionId, budgetAllocationLabel(item)]));
      for (const log of globalEngine.auditLogs) {
        const label = allocationBySubscription.get(log.subscription_id);
        if (label) log.budget_allocation = label;
      }
      globalEngine.persist();
      const experiment = saveExperimentRun(operationalDb, {
        seed,
        policyVersion: 'v5-2026-08-28',
        inputBatch: Array.from(globalEngine.cases.values()),
        treatmentCount: stats.treatment_cases,
        controlCount: stats.control_cases,
        zScore: stats.z_score,
        pValue: stats.p_value,
        headlineRecoveredPaise: stats.net_attributable_recovery_paise,
        sensitivity: {
          pessimistic: sensitivity[0]?.net_attributable_paise || 0,
          base: sensitivity[1]?.net_attributable_paise || 0,
          optimistic: sensitivity[2]?.net_attributable_paise || 0,
        },
      });

      res.json({
        status: 'success',
        batch_result: batchResult,
        stats,
        sensitivity,
        experiment_run_id: experiment.runId,
      });
    } catch (err) {
      logger.error('Batch run error', err);
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      res.status(500).json({ status: 'error', message });
    }
  });

  // 6. Settings Controls: Kill Switch, Dry Run, Clock Advance
  app.post('/api/settings/toggle-kill-switch', (req, res) => {
    globalEngine.killSwitchActive = !globalEngine.killSwitchActive;
    globalEngine.persist();
    res.json({
      status: 'success',
      kill_switch_active: globalEngine.killSwitchActive,
    });
  });

  app.post('/api/settings/toggle-dry-run', (req, res) => {
    globalEngine.dryRunActive = !globalEngine.dryRunActive;
    globalEngine.persist();
    res.json({
      status: 'success',
      dry_run_active: globalEngine.dryRunActive,
    });
  });

  app.post('/api/settings/advance-clock', (req, res) => {
    const hours = req.body.hours || 24;
    globalEngine.advanceClock(hours).then(() => res.json({
      status: 'success',
      mocked_clock_time: globalEngine.mockedClockTime,
      formatted_ist: new Date(globalEngine.mockedClockTime * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      is_inside_quiet_hours: globalEngine.isInsideQuietHours(globalEngine.mockedClockTime),
    })).catch((err) => res.status(500).json({ status: 'error', message: err.message }));
  });

  app.post('/api/case/opt-out', (req, res) => {
    const subCase = globalEngine.cases.get(req.body.subscription_id);
    if (!subCase) return res.status(404).json({ status: 'error', message: 'Case not found' });
    globalEngine.suppressionList.add(subCase.customer_phone_masked);
    globalEngine.persist();
    res.json({ status: 'success', subscription_id: subCase.subscription_id, suppressed: true });
  });

  app.post('/api/case/link-event', (req, res) => {
    const subCase = globalEngine.cases.get(req.body.subscription_id);
    if (!subCase) return res.status(404).json({ status: 'error', message: 'Case not found' });
    if (req.body.event === 'opened') subCase.link_opened_at = globalEngine.mockedClockTime;
    if (req.body.event === 'abandoned' && subCase.link_opened_at && globalEngine.mockedClockTime - subCase.link_opened_at >= 86400) {
      subCase.broken_promises_count += 1;
      subCase.link_opened_at = undefined;
    }
    globalEngine.persist();
    res.json({ status: 'success', broken_promises_count: subCase.broken_promises_count });
  });

  // 7. Human Review Approval
  app.post('/api/case/action', async (req, res) => {
    try {
      const subscription_id = validateNonEmptyString(req.body.subscription_id, 'subscription_id');
      const action = validateNonEmptyString(req.body.action, 'action');
      
      const subCase = globalEngine.cases.get(subscription_id);
    if (!subCase) {
      return res.status(404).json({ status: 'error', message: 'Case not found' });
    }

    if (action === 'approve_and_send') {
      subCase.needs_human_approval = false;
      const result = await globalEngine.processWebhook({
        event_id: `evt_human_apprv_${Date.now()}`,
        event_type: 'subscription.halted',
        subscription_id,
        customer_name: subCase.customer_name,
        customer_phone_masked: subCase.customer_phone_masked,
        customer_email_masked: subCase.customer_email_masked,
        plan_name: subCase.plan_name,
        amount_paise: subCase.amount_paise,
        arm: subCase.arm,
        result_label: 'observed_test',
        payment_route: subCase.reason_bucket === 'mandate_expired' ? 'agent_card_update' : 'agent_payment_link',
      });
      return res.json({ status: 'success', subCase, auditEntry: result.auditEntry });
    }

    if (action === 'simulate_payment_capture') {
      const result = await globalEngine.processWebhook({
        event_id: `evt_manual_cap_${Date.now()}`,
        event_type: 'payment.captured',
        subscription_id,
        customer_name: subCase.customer_name,
        customer_phone_masked: subCase.customer_phone_masked,
        customer_email_masked: subCase.customer_email_masked,
        plan_name: subCase.plan_name,
        amount_paise: subCase.amount_paise,
        arm: subCase.arm,
        result_label: 'observed_test',
        payment_route: subCase.reason_bucket === 'mandate_expired' ? 'agent_card_update' : 'agent_payment_link',
      });
      return res.json({ status: 'success', subCase, auditEntry: result.auditEntry });
    }

    res.json({ status: 'ok', subCase });
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(400).json({ status: 'error', message: err.message, field: err.field });
      }
      logger.error('Case action error', err, { subscription_id: req.body.subscription_id, action: req.body.action });
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      res.status(500).json({ status: 'error', message });
    }
  });

  // 8. Automated Acceptance Criteria Test Suite (§16 Pre-demo verification gate)
  app.get('/api/acceptance-tests', async (req, res) => {
    const results = await runAcceptanceVerificationSuite();
    res.json(results);
  });

  // 9. B2B Receivables Stretch Module
  app.get('/api/receivables', (req, res) => {
    const summary = globalReceivablesEngine.getReceivablesSummary();
    res.json(summary);
  });

  // ==========================================
  // Vite middleware for development & SPA serving
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, SERVER_HOST, () => {
    logger.info('Server running', { url: `http://${SERVER_HOST}:${PORT}` });
  });
}

startServer();
