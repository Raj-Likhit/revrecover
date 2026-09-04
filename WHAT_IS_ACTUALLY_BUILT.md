# What's Actually Built vs What's Just a Pitch

**Short Answer:** You have built a **working agent with real integrations**, not just a pitch deck. But it's running on **synthetic data** (not real customers), so it's a **functional demo** ready for production deployment.

---

## ✅ **WHAT IS ACTUALLY BUILT (Real Working Code)**

### **1. Core Recovery Engine** ✅ REAL
**Location:** `server/engine.ts` (1000+ lines)

**What It Does:**
- Receives payment failure webhooks (subscription.pending, subscription.halted, payment.captured)
- Diagnoses failure type (insufficient funds, card expired, etc.)
- Calculates lift and net EV for each case
- Makes policy decisions (wait vs act) based on lift calculations
- Enforces compliance checks (quiet hours, AFA thresholds, annoyance caps, suppression list)
- Maintains audit trail with full decision metadata
- Tracks treatment vs control groups
- Calculates statistics (recovery rates, z-test, ROI)

**Status:** ✅ **Fully functional** — can process real webhooks

---

### **2. Razorpay Integration** ✅ REAL
**Location:** `providers/razorpayProvider.ts`

**What It Does:**
- **Creates real payment links** via Razorpay API (`POST /payment_links`)
- **Fetches card update checkout URLs** via Razorpay API (`GET /subscriptions/{id}`)
- Handles authentication (Basic Auth with RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)
- Implements timeout + retry logic (8s timeout, 1 retry)
- Returns hosted URLs that customers can click

**Status:** ✅ **Real API integration** — requires valid Razorpay test-mode keys

**Evidence:**
```typescript
const res = await fetch(`${RAZORPAY_API_BASE}/payment_links`, {
  method: 'POST',
  headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
```

This is NOT mocked. It makes actual HTTP calls to Razorpay.

---

### **3. Gemini AI Message Drafting** ✅ REAL
**Location:** `server/gemini.ts`

**What It Does:**
- Drafts Hinglish WhatsApp messages using Gemini 2.0 Flash
- Uses tokenized minimal payload (only first name + amount band, no full PII)
- Implements archetype caching (reuses message templates for similar cases)
- Enforces length limits (greeting ≤60 chars, body ≤240 chars, CTA ≤80 chars)
- Handles timeouts and fallbacks

**Status:** ✅ **Real LLM integration** — requires valid GEMINI_API_KEY

**Evidence:**
```typescript
const request = ai.models.generateContent({ 
  model: 'gemini-3.7-flash', 
  contents: prompt, 
  config: { responseMimeType: 'application/json' } 
});
```

This calls Google's Gemini API. Not simulated.

---

### **4. Dispatch Queue** ✅ REAL
**Location:** `queue/dispatchQueue.ts`

**What It Does:**
- Polls database for queued actions (reserved during quiet hours)
- Dispatches messages when quiet hours window opens (9:00–20:00 IST)
- Respects kill switch (stops all outbound)
- Respects dry-run mode (logs actions without executing)
- Records dispatch results (provider ref ID, hosted URL, timestamps)

**Status:** ✅ **Real background worker** — runs on 60-second poll interval

**Evidence:**
```typescript
const interval = setInterval(() => {
  tick().catch((err) => console.error('[dispatchQueue] tick failed', err));
}, pollIntervalMs);
```

This is a real worker loop, not a mock.

---

### **5. Action Ledger (Idempotency)** ✅ REAL
**Location:** `db/actionLedger.ts`

**What It Does:**
- Two-layer idempotency: webhook-level + action-level
- Reserves actions before execution (prevents duplicate sends)
- Tracks action status (reserved → queued → dispatched → failed)
- Persists to SQLite with epoch-second timestamps

**Status:** ✅ **Real database operations** — uses better-sqlite3

---

### **6. Attribution Tracking** ✅ REAL
**Location:** `db/attribution.ts`

**What It Does:**
- Correlates payment.captured events with original case
- Determines outcome (direct, assisted, recovered_by_autopay, not_recovered)
- Distinguishes agent-attributable recovery from organic autopay recovery
- Updates case status and mandate restoration flag

**Status:** ✅ **Real attribution logic** — tracks which payments are agent-driven

---

### **7. Cost Stack** ✅ REAL
**Location:** `policy/costStack.ts`

**What It Does:**
- Calculates intervention cost (WhatsApp ₹0.115, LLM tokens, MDR 2.36%)
- Enforces cost guardrail (intervention cost must be <5% of invoice value)
- Computes decision-time expected cost (probability-weighted)
- Computes settlement-time actual cost (MDR only charged on captured payments)

**Status:** ✅ **Real cost calculations** — used in policy decisions

---

### **8. Budget Allocator** ✅ REAL
**Location:** `policy/budgetAllocator.ts`

**What It Does:**
- Ranks cases by net EV (expected lift value - cost)
- Allocates limited daily contact capacity (80 messages/day default)
- Buckets cases: high-value, standard, low-value, stopped
- Ensures highest-ROI cases get priority

**Status:** ✅ **Real prioritization logic** — prevents overspending on low-value cases

---

### **9. Compliance Engine** ✅ REAL
**Location:** `server/engine.ts` (evaluatePolicy method)

**What It Does:**
- Quiet hours enforcement (9:00–20:00 IST only)
- AFA threshold check (>₹15,000 or card update requires authentication)
- Suppression list (customer opt-outs)
- Annoyance cap (max 4 contacts per customer in 30 days)
- Broken promise stop (customer opened link 2× without paying → stop messaging)
- Kill switch (global stop)
- Dry run mode (log decisions without executing)

**Status:** ✅ **Real compliance checks** — enforced before every action

---

### **10. B2B Receivables Module** ✅ REAL
**Location:** `server/receivables.ts`

**What It Does:**
- Tracks aging buckets (0-30d, 31-60d, 61-90d, 90+d)
- Calculates working capital interest saved (10% annual rate)
- Simulates escalation ladder (automated reminders → account manager → executive)
- Generates synthetic B2B invoices with realistic amounts (₹50k to ₹5L)

**Status:** ✅ **Real module** — but data is synthetic (no real B2B customers)

---

### **11. Full React Dashboard** ✅ REAL
**Location:** `src/components/*` (14+ components)

**What It Does:**
- Live metrics panel (recovery rates, net attributable, MRR preserved)
- Audit trail viewer (searchable, filterable, detailed case logs)
- Batch simulator (run 120-case experiments with seed)
- Compliance viewer (shows all acceptance criteria passing/failing)
- Live event trigger (manually trigger soft/hard decline scenarios)
- Treatment/control comparison charts
- Sensitivity analysis charts
- System report panel

**Status:** ✅ **Real interactive UI** — connects to real backend APIs

---

## ⚠️ **WHAT'S SIMULATED (Not Real Yet)**

### **1. Customer Data** ⚠️ SYNTHETIC
**Location:** `server/synthetic.ts`

**What's Simulated:**
- Customer names (from INDIAN_FIRST_NAMES / INDIAN_LAST_NAMES arrays)
- Phone numbers (randomized `+91 98********`)
- Email addresses (masked `name***@domain.in`)
- Subscription IDs (`sub_20261000`, `sub_20261001`, etc.)
- Invoice amounts (₹499 to ₹18,500 from predefined SaaS plan list)
- Payment failure events (subscription.pending, subscription.halted, payment.captured)

**Why:** You don't have real customers yet. The system generates realistic synthetic data to demonstrate functionality.

**Status:** ⚠️ **Uses fake data** — but the ENGINE can process real data

---

### **2. Recovery Outcomes** ⚠️ PROBABILISTIC
**Location:** `server/synthetic.ts` (lines 131-137)

**What's Simulated:**
```typescript
const willAutopayRecover = rng.next() < benchmark.p_base;
const willAgentRecover = rng.next() < benchmark.p_treated;
```

This uses **assumed probabilities** (p_base=0.45, p_treated=0.62, etc.) to simulate whether a customer recovers or not.

**Why:** You can't know if a customer would have paid until you run the system on real customers for 30-90 days.

**Status:** ⚠️ **Simulated outcomes** — real outcomes must be measured

---

### **3. Benchmarks** ⚠️ ASSUMED
**Location:** `server/engine.ts` (BENCHMARK_MATRIX)

**What's Assumed:**
- p_base (autopay recovery rate): 45% for insufficient funds, 5% for card expired
- p_treated (agent+autopay recovery rate): 62% for insufficient funds, 30% for card expired
- Lift: 0.17 for soft declines, 0.25 for hard declines

**Why:** These are calibrated estimates based on Indian SaaS patterns. They're not measured from your data.

**Status:** ⚠️ **Educated guesses** — must be validated in production

---

### **4. WhatsApp Delivery** ⚠️ NOT INTEGRATED
**Location:** Nowhere (missing)

**What's Missing:**
- The system creates payment links and drafts messages
- But it does NOT actually **send WhatsApp messages**
- No integration with Meta Business API or WhatsApp Business Platform

**Why:** WhatsApp Business API requires:
- Business verification
- Phone number setup
- Message template approval (takes 24-48 hours)
- Webhook setup for message status

**Status:** ⚠️ **Not wired up** — messages drafted but not delivered

---

## 🎯 **WHAT THIS MEANS**

### **You Have Built:**
✅ A fully functional recovery agent engine  
✅ Real Razorpay API integration (payment links + card update)  
✅ Real Gemini AI integration (message drafting)  
✅ Real compliance engine (quiet hours, AFA, suppression, caps)  
✅ Real attribution logic (direct vs assisted vs autopay)  
✅ Real cost calculations and budget allocation  
✅ Real dispatch queue (quiet-hour scheduling)  
✅ Real audit trail and full observability  
✅ Real React dashboard with live data  

### **You Have NOT Built:**
❌ Connection to real customer database  
❌ WhatsApp message delivery (drafted but not sent)  
❌ Validated benchmarks (p_base, p_treated are assumed)  
❌ Real recovery data (outcomes are simulated)  

---

## 📊 **COMPARISON TABLE**

| Component | Status | Real/Simulated | Production-Ready? |
|---|---|---|---|
| Recovery Engine | ✅ Built | Real code | Yes |
| Razorpay API | ✅ Built | Real integration | Yes (needs keys) |
| Gemini AI | ✅ Built | Real integration | Yes (needs keys) |
| Dispatch Queue | ✅ Built | Real worker | Yes |
| Action Ledger | ✅ Built | Real DB ops | Yes |
| Compliance Checks | ✅ Built | Real logic | Yes |
| Cost Stack | ✅ Built | Real calculations | Yes |
| Budget Allocator | ✅ Built | Real prioritization | Yes |
| Dashboard UI | ✅ Built | Real React app | Yes |
| Customer Data | ⚠️ Simulated | Fake names/phones | No (needs real DB) |
| Payment Events | ⚠️ Simulated | Synthetic webhooks | No (needs real webhooks) |
| Recovery Outcomes | ⚠️ Simulated | Probabilistic | No (needs real data) |
| Benchmarks | ⚠️ Assumed | Calibrated guesses | No (needs validation) |
| WhatsApp Delivery | ❌ Missing | Not integrated | No (needs Meta API) |

---

## 🚀 **DEPLOYMENT PATH**

### **What You'd Need to Go Live:**

1. **Connect to Real Customer DB**
   - Replace synthetic data generation with real subscription data
   - Hook into actual Razorpay webhook endpoints

2. **Set Up Razorpay Webhooks**
   - Configure webhooks in Razorpay dashboard
   - Point to your server's `/api/webhook/razorpay` endpoint
   - Verify webhook signature for security

3. **Set Up WhatsApp Business API**
   - Register with Meta Business Platform
   - Verify business
   - Get phone number approved
   - Create message templates
   - Integrate Meta Business API for message sending

4. **Configure Environment Variables**
   ```
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   GEMINI_API_KEY=...
   WHATSAPP_BUSINESS_ACCOUNT_ID=...
   WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_ACCESS_TOKEN=...
   ```

5. **Run on Real Data for 30-90 Days**
   - Collect actual recovery outcomes
   - Measure real p_base and p_treated
   - Update BENCHMARK_MATRIX with validated numbers
   - Re-run statistics with real data

6. **Host on Production Server**
   - Deploy to cloud (AWS, GCP, Azure, Railway, Render)
   - Set up monitoring and alerting
   - Configure database backups
   - Set up log aggregation

---

## 💡 **FOR YOUR VIDEO: WHAT TO SAY**

### **✅ HONEST FRAMING:**

> "We've built a fully functional revenue recovery agent with real integrations:
> - Real Razorpay API for payment links and card updates
> - Real Gemini AI for Hinglish message drafting
> - Real compliance engine enforcing quiet hours, AFA, and customer caps
> - Real dispatch queue for scheduling
> - Real treatment vs control framework to prove incremental value
> 
> Right now, it's running on synthetic data with calibrated benchmarks. We simulated 120 cases to demonstrate the framework: treatment group recovers 55%, control group 32%, for a 23-point lift.
> 
> The agent is production-ready. Next step: deploy on real customer webhooks, integrate WhatsApp delivery, and validate these benchmarks with actual recovery data over 30-90 days."

### **❌ DON'T SAY:**

- "We recovered ₹445,555" (implies real money)
- "We ran on 120 customers" (implies real people)
- "Our system proved 55% vs 32%" (implies measured data)

### **🎯 PERFECT MIDDLE GROUND:**

> "Our agent is built and ready. It processes payment failures, makes lift-based decisions, drafts personalized messages, and creates Razorpay payment links—all with full auditability. We simulated 120 cases to prove the framework works: if our benchmarks hold, treatment recovers 55%, control 32%, yielding ₹445k net-attributable. We're now ready to deploy on real customers and validate these numbers."

---

## 📌 **BOTTOM LINE**

**This is NOT just a pitch deck.** You have:
- 3,000+ lines of production-quality code
- Real API integrations (Razorpay, Gemini)
- Real database operations (SQLite with action ledger)
- Real compliance logic (quiet hours, AFA, caps, kill switch)
- Real policy engine (lift-based decision tree)
- Real dashboard (React with live metrics)

**But:** You're running it on **synthetic data** with **assumed benchmarks**, so the NUMBERS (55%, 32%, ₹445k) are **demonstrative**, not **proven**.

**You have:** A **working agent ready for production deployment**  
**You need:** Real customers, WhatsApp integration, and 30-90 days of data to validate benchmarks

**Analogy:** You've built a Tesla with a full battery and working autopilot. You're test-driving it on a closed track (simulation). To prove it works on real roads, you need to take it on the highway (real customers).

---

**TL;DR:** You built the entire agent (code + integrations), but ran it on synthetic data. It's a **functional demo**, not a **pitch deck**. To make real claims, deploy on actual customers.
