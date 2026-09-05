# RevRecover

**Smart Triage Payment Recovery System**

RevRecover uses AI-driven smart triage to demonstrate **26.6% lift** in a controlled simulation through strategic restraint, control group validation, and compliance-first design.

## Key Features

- **26.6% Simulated Lift** - Validated through control group A/B testing in simulation (z=2.59, p=0.0096)
- **6 Failure Types** - Differential strategies for card expired, insufficient funds, AFA, halted subscriptions, unknown declines, technical timeouts
- **Strategic Restraint** - WAIT on soft declines (45% autopay baseline), ACT on hard declines (5% baseline)
- **Compliance-First** - RBI AFA thresholds, DLT templates, quiet hours, opt-out tracking
- **Cost Guardrails** - Budget allocation, cost-benefit prioritization, intervention caps
- **Complete Audit Trail** - Every decision logged with full rationale and telemetry

## Tech Stack

- **Backend**: TypeScript/Node.js with Express
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: SQLite with WAL mode for concurrency
- **Deployment**: Serverless-ready architecture

## Quick Start

### Prerequisites
- Node.js 18+
- npm or bun

### Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your Razorpay API key and Gemini API key

# Run development server
npm run dev
```

The app will start at `http://localhost:3000` with:
- React frontend on port 5173
- Express API on port 3000

### Live Demo

Click any of the 5 failure scenarios to trigger the recovery engine:

1. **💧 Soft Decline** - Insufficient funds → System WAITS for autopay (25% lift with restraint)
2. **🔴 Hard Decline** - Card expired → System SENDS card update link (25% lift immediate action)
3. **🔐 AFA Required** - High value (₹18.5k+) → System SENDS OTP link (30% lift, 92× ROI)
4. **⏸️ Subscription Halted** - Service offline → System deploys empathy ladder (55% lift, churn prevention)
5. **❓ Unknown Decline** - Ambiguous error → System ESCALATES to human (18% lift, better CX)

## Architecture

```
Payment Event
    ↓
Failure Type Classification (6 types)
    ↓
Smart Triage Policy Engine
    ├─ Soft Decline → WAIT (let autopay retry free)
    ├─ Hard Decline → ACT (send recovery link)
    ├─ High Value → SEND OTP (RBI AFA compliant)
    ├─ Halted → EMPATHY LADDER (churn prevention)
    ├─ Unknown → ESCALATE (human review)
    └─ Technical → WAIT (transient timeout)
    ↓
80/20 A/B Assignment
    ├─ Treatment Arm (80%): Policy actions executed
    └─ Control Arm (20%): Autopay only (baseline)
    ↓
Audit Log + Metrics Calculation
    └─ True incremental lift = Treatment − Control
```

## Key Metrics

From simulated evaluation (seed 20260825, median of 10 runs):

| Metric | Value |
|---|---|
| Treatment Recovery Rate | 44.4% (52/117 cases) |
| Control Recovery Rate | 17.9% (5/28 cases) |
| **Simulated Lift** | **+26.6 percentage points** |
| Net Attributable Recovery | ₹226,394 |
| Statistical Significance | z=2.59, p=0.0096 |
| Average ROI | ~37× (17-92× by failure type) |

## Compliance

- ✅ RBI AFA threshold compliance (₹15,000 rule)
- ✅ DLT template tracking for WhatsApp/SMS
- ✅ Quiet hours enforcement (9 PM - 9 AM IST)
- ✅ Opt-out suppression list
- ✅ Grace periods for halted subscriptions
- ✅ Multi-stage escalation for ambiguous cases

## Project Structure

```
revrecover/
├── server.ts              # Main Express server & API routes
├── server/                # Modular business logic
│   ├── engine.ts         # Core triage policy engine
│   ├── synthetic.ts      # Batch simulation generator
│   ├── store.ts          # Audit log persistence
│   └── ...
├── db/                   # Database schema & operations
│   ├── schema.sql        # SQLite schema
│   └── ...
├── policy/               # Policy & allocation logic
│   ├── budgetAllocator.ts
│   └── costStack.ts
├── src/                  # React frontend
│   ├── components/       # UI components
│   └── types/           # TypeScript types
├── data/                 # SQLite database
└── package.json
```

## Environment Variables

```env
# Database
DATABASE_URL=./data/revrecover.sqlite

# Razorpay (optional for production)
RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_SECRET=xxx

# Gemini API (for LLM features)
GEMINI_API_KEY=xxx

# Server
PORT=3000
NODE_ENV=development
```

## Testing

Run the batch simulator to validate policy logic:

```bash
npm run test
```

Or test specific scenarios via the web UI by clicking scenario buttons.

## Performance

- **Cold start**: ~200ms
- **Recovery decision**: <50ms
- **Batch run (145 cases)**: ~2-3 seconds
- **Concurrent requests**: WAL mode supports safe concurrent readers/writers

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

## Next Steps

1. **Validate on Live Data** - Deploy to real payment failures
2. **Refine Benchmarks** - Update p_base & p_treated from actual recovery data
3. **Extend Coverage** - Add more failure type patterns
4. **LLM Integration** - Replace deterministic rules with safe LLM diagnosis layer
5. **Multi-Region** - Adapt quiet hours, compliance rules per region

## Contributing

This is a Buildathon 2026 submission. Contributions welcome via PRs.

## License

MIT

## Contact

Questions? Check the inline code comments and architecture documentation.

---

**Status**: Presentation-ready. Production deployment requires benchmarks validation on real customer data.
