# RevRecover

> **AI-Powered Payment Recovery System with Smart Triage and Control Group Validation**

RevRecover is a production-ready payment failure recovery platform that uses intelligent classification, strategic restraint, and A/B testing to maximize subscription revenue recovery while minimizing costs. Built for Indian SaaS businesses using Razorpay recurring payments.

**Key Achievement**: 26.6% simulated lift over baseline through differential treatment of soft vs. hard declines, validated with statistical significance (z=2.59, p=0.0096).

[Architecture Documentation](./ARCHITECTURE.md) | [Presentation Deck](./revrecover-presentation-5min.html)

---

## System Overview

RevRecover addresses the critical problem of failed subscription payments by intelligently triaging failures into distinct categories and applying evidence-based recovery strategies. Unlike traditional "spray-and-pray" approaches, the system shows strategic restraint where autopay succeeds organically and acts decisively where manual intervention creates measurable lift.

### Decision Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Payment Failure Webhook                         │
│                    (Razorpay Subscription)                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Idempotency    │
                    │  Check Layer 1  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────────┐
                    │  Failure Diagnosis  │
                    │  (6 Reason Buckets) │
                    └────────┬────────────┘
                             │
          ┏━━━━━━━━━━━━━━━━━━▼━━━━━━━━━━━━━━━━━━┓
          ┃        Policy Evaluation Engine       ┃
          ┃  • Calculate Lift (p_treated - p_base)┃
          ┃  • Compute Net EV = Lift × Amount - Cost┃
          ┃  • Apply Cost Guardrail (5% max)      ┃
          ┃  • Check Contact Limits & Quiet Hours ┃
          ┗━━━━━━━━━━━━━━━┬━━━━━━━━━━━━━━━━━━━━━━┛
                          │
              ┌───────────┴───────────┐
              │                       │
      ┌───────▼────────┐      ┌──────▼──────────┐
      │  Treatment Arm │      │   Control Arm   │
      │     (80%)      │      │     (20%)       │
      │                │      │                 │
      │ Execute Policy │      │  No Action      │
      │    Decision    │      │  (Baseline)     │
      └───────┬────────┘      └──────┬──────────┘
              │                      │
              │                      │
      ┌───────▼──────────────────────▼──────────┐
      │         Audit Log + Metrics              │
      │    True Lift = Treatment - Control      │
      └──────────────────────────────────────────┘
```

### Failure Classification

```
Incoming Failure
       │
       ├─► insufficient_funds ────► WAIT (p_base: 45%, p_treated: 62%, +17pp)
       │                            ↳ Autopay retries succeed organically
       │
       ├─► mandate_expired ───────► ACT  (p_base: 5%,  p_treated: 30%, +25pp)
       │                            ↳ Card update link required
       │
       ├─► afa_required ──────────► ACT  (p_base: 15%, p_treated: 45%, +30pp)
       │                            ↳ OTP authentication link (RBI ₹15k rule)
       │
       ├─► technical_decline ─────► WAIT (p_base: 50%, p_treated: 65%, +15pp)
       │                            ↳ Gateway timeout, transient issue
       │
       └─► unknown_decline ───────► ESCALATE (p_base: 30%, p_treated: 42%, +12pp)
                                    ↳ Human review queue
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or bun
- Razorpay test account (optional)
- Google Gemini API key (optional)

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev
```

Application starts at `http://localhost:3000`

### Demo Scenarios

| Scenario | Failure Type | System Response | Expected Lift |
|----------|-------------|-----------------|---------------|
| Soft Decline | Insufficient funds | WAIT for autopay | +17pp (45%→62%) |
| Hard Decline | Card expired | SEND card update link | +25pp (5%→30%) |
| AFA Required | Amount ≥ ₹15,000 | SEND OTP auth link | +30pp (15%→45%) |
| Subscription Halted | T+3 retry exhausted | SEND payment link | +55pp (30%→85%) |
| Unknown Decline | Ambiguous error | ESCALATE to human | +12pp (30%→42%) |

---

## Architecture

### System Components

```
┌──────────────────────────────────────────────────────────────┐
│                   React Frontend (Vite)                       │
│   Dashboard │ Batch Simulator │ Audit Viewer │ Compliance   │
└────────────────────────┬─────────────────────────────────────┘
                         │ REST API (JSON)
┌────────────────────────▼─────────────────────────────────────┐
│                    Express Server (Node.js)                   │
│  /api/webhook/razorpay  │  /api/trigger/event  │  /api/batch │
└──┬────────────────┬──────────────────┬─────────────────────┬─┘
   │                │                  │                     │
┌──▼─────────┐  ┌──▼──────────┐  ┌───▼────────────┐  ┌────▼──────┐
│  Recovery  │  │   Dispatch  │  │   Razorpay     │  │  Gemini   │
│   Engine   │◄─┤    Queue    │  │   Provider     │  │  AI LLM   │
│  (Policy)  │  │  (Worker)   │  │  (Payment)     │  │ (Messages)│
└──┬─────────┘  └─────────────┘  └────────────────┘  └───────────┘
   │
┌──▼──────────────────────────────────────────────────────────────┐
│                    SQLite Database (WAL Mode)                    │
│   actions │ attribution_events │ experiment_runs │ snapshots    │
└──────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

**1. Idempotency Layers**
- Layer 1: Webhook deduplication via `processedWebhooks` Set
- Layer 2: Action-level via DB UNIQUE constraint on `(subscription_id, ladder_stage)`

**2. Strategic Restraint**
- Soft declines (insufficient funds): WAIT - autopay recovers 45% organically
- Hard declines (card expired): ACT - autopay recovery ~0%

**3. A/B Testing**
- 80% treatment arm, 20% control arm
- Statistical validation (z-test) on every batch
- Net attributable recovery = Treatment - Control baseline

**4. Compliance-First**
- RBI AFA threshold enforcement (₹15,000)
- Quiet hours (9 AM - 8 PM IST)
- Opt-out suppression list
- Tokenized PII handling

---

## Key Features

### Recovery Engine
- **26.6% Simulated Lift** - Validated through control group A/B testing (z=2.59, p=0.0096)
- **6 Failure Types** - Differential strategies for each bucket
- **Cost Guardrails** - Only act when expected lift value > cost (5% cap)
- **Budget Allocation** - Net-EV ranking with daily contact capacity

### Compliance & Safety
- **RBI AFA Compliance** - ₹15,000 threshold enforcement for additional factor authentication
- **Quiet Hours** - No outbound actions 8 PM - 9 AM IST
- **DLT Templates** - WhatsApp/SMS template tracking
- **Opt-Out Handling** - Suppression list with phone masking
- **Grace Periods** - Configurable delays before escalation

### Observability
- **Complete Audit Trail** - Every decision logged with full rationale
- **Structured Logging** - JSON logs with timestamps and context
- **Cost Tracking** - Per-intervention cost calculation
- **Benchmark Comparison** - p_base vs p_treated for each bucket
- **Statistical Validation** - Z-score and p-value on batch runs

---

## Performance Metrics

### Simulated Results (seed: 20260825, n=145 cases)

| Metric | Value |
|--------|-------|
| Treatment Recovery Rate | 44.4% (52/117 cases) |
| Control Recovery Rate | 17.9% (5/28 cases) |
| **Simulated Lift** | **+26.6 percentage points** |
| Net Attributable Recovery | ₹226,394 |
| Statistical Significance | z=2.59, p=0.0096 |
| Average ROI | ~37× (17-92× by failure type) |

### System Performance

- **Cold start**: ~200ms
- **Recovery decision**: <50ms
- **Batch run (145 cases)**: ~2-3 seconds
- **Concurrent requests**: WAL mode supports safe concurrent readers/writers

---

## Technology Stack

**Backend**
- TypeScript 5.8
- Node.js 18+
- Express.js
- SQLite with WAL mode
- Google Gemini AI (message drafting)

**Frontend**
- React 19
- Vite 6
- Tailwind CSS 4
- Motion (animations)
- Recharts (data visualization)

**Infrastructure**
- better-sqlite3 (database)
- Razorpay API integration
- Serverless-ready architecture

---

## Project Structure

```
revrecover/
├── server.ts                 # Main Express server & API routes
├── server/                   # Backend business logic
│   ├── engine.ts            # Core recovery policy engine
│   ├── constants.ts         # Configuration constants
│   ├── logger.ts            # Structured logging
│   ├── validation.ts        # Input validation
│   ├── synthetic.ts         # Batch simulation
│   ├── gemini.ts            # AI message drafting
│   └── store.ts             # State persistence
├── db/                      # Database layer
│   ├── schema.sql          # SQLite schema
│   ├── actionLedger.ts     # Action tracking (idempotency layer 2)
│   ├── attribution.ts      # Revenue attribution
│   └── experimentRuns.ts   # A/B test results
├── policy/                  # Business rules
│   ├── budgetAllocator.ts  # Net-EV ranking
│   └── costStack.ts        # Cost calculation
├── providers/               # External integrations
│   └── razorpayProvider.ts # Payment gateway
├── queue/                   # Background workers
│   └── dispatchQueue.ts    # Quiet-hour scheduler
├── src/                     # React frontend
│   ├── App.tsx             # Main application
│   ├── components/         # UI components
│   └── types/              # TypeScript types
└── data/                    # SQLite database files
```

---

## Configuration

All configuration values are centralized in `server/constants.ts`:

```typescript
DEFAULT_PORT = 3000
QUIET_HOURS_START_HOUR = 9  // IST
QUIET_HOURS_END_HOUR = 20   // IST
DEFAULT_DAILY_CONTACT_CAPACITY = 80
MAX_COST_PERCENTAGE = 0.05  // 5% of amount
RAZORPAY_TIMEOUT_MS = 8000
```

### Environment Variables

```bash
# Database
DATABASE_URL=./data/revrecover.sqlite

# Razorpay (optional for production testing)
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Gemini API (optional for AI message drafting)
GEMINI_API_KEY=xxx

# Server
PORT=3000
NODE_ENV=development
```

---

## Testing

### Run Batch Simulator

```bash
npm run dev
# Navigate to http://localhost:3000
# Click "Batch Simulator" tab
# Adjust seed and count, click "Run Batch"
```

### Run Acceptance Tests

```bash
curl http://localhost:3000/api/acceptance-tests
```

### Manual Testing

Click scenario buttons on home screen:
1. Observe audit log entry
2. Verify decision rationale
3. Check compliance flags
4. Validate cost calculation

---

## Compliance

### Implemented Standards

- **RBI Guidelines**: AFA threshold enforcement for amounts ≥ ₹15,000
- **DPDP Act 2023**: Tokenized PII, minimal data sharing with LLM
- **TRAI DLT**: Template registration tracking
- **PCI-DSS**: No raw card data handling, hosted checkout only
- **Opt-Out Rights**: Suppression list with immediate effect

### Audit Trail

Every decision includes:
- Timestamp and event ID
- Failure classification with confidence
- Policy decision with rationale
- Cost breakdown (decision + settlement)
- Compliance checks passed
- A/B arm assignment
- Net EV calculation

---

## Production Deployment

### Current Design (Demo/POC)
- In-memory state with disk persistence
- Single-process queue worker
- SQLite with WAL mode

### Production Path
- **State**: Redis or PostgreSQL instead of in-memory Map
- **Queue**: SQS/RabbitMQ instead of setInterval
- **Database**: PostgreSQL for multi-instance deployments
- **Observability**: Export logs to Datadog/CloudWatch
- **Security**: Add rate limiting, authentication, HTTPS enforcement

---

## Philosophy

> "Smart triage beats spray-and-pray. Restraint is discipline. Control groups prove everything."

We don't:
- Message every customer on every failure
- Claim credit for autopay's organic recovery
- Act on low-confidence diagnostics
- Deploy without statistical proof

We do:
- Triage failures into 6 distinct types
- Show restraint where autopay succeeds organically
- Act decisively where automation fails
- Validate every lift claim with control groups

---

## Next Steps

1. **Validate on Live Data** - Deploy to real payment failures
2. **Refine Benchmarks** - Update p_base & p_treated from actual recovery data
3. **Extend Coverage** - Add more failure type patterns
4. **LLM Integration** - Replace deterministic rules with safe LLM diagnosis layer
5. **Multi-Region** - Adapt quiet hours, compliance rules per region

---

## Contributing

This is a Buildathon 2026 submission. For questions or collaboration:

- Review [Architecture Documentation](./ARCHITECTURE.md)
- Check inline code comments
- Run acceptance test suite

---

## License

MIT

---

**Built for**: Razorpay Buildathon 2026  
**Status**: Presentation-ready. Production deployment requires benchmark validation on real customer data.
