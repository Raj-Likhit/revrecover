# RevRecover Idempotency Layer

## Overview

RevRecover implements a **two-layer idempotency system** to prevent duplicate processing of webhook events and policy decisions. This ensures financial accuracy and prevents multiple interventions for the same customer case.

## Problem Solved

**Without idempotency:**
- A webhook retry could cause the same subscription to receive multiple SMS/email notifications
- A policy decision could be executed multiple times, creating duplicate payment links
- The same case could enter multiple pipeline stages simultaneously

**With idempotency:**
- Each webhook is processed exactly once, identified by `event_id`
- Each stage transition happens exactly once, identified by `subscription_id:stage`
- Duplicate requests return cached results immediately

## Architecture

### Layer 1: Webhook Event Deduplication

**What it does:** Prevents the same webhook from being processed twice

**How it works:**
```
Webhook arrives with event_id = "evt_xyz_123"
├─ Check: Is evt_xyz_123 in processedWebhooks set?
├─ YES → Return cached result immediately (isDuplicate: true)
└─ NO → Process webhook and store event_id in set
```

**Key fields in webhook:**
- `event_id` (required): Unique identifier from payment gateway
- Example: `evt_demo_soft_1725098734` or `evt_razorpay_subsc_1234`

**Storage:**
- In-memory `Set<string>` for speed
- Persisted to SQLite via `RecoveryStore`
- 24-hour TTL for memory cleanup

**Code in engine.ts (line 540):**
```typescript
if (this.processedWebhooks.has(event.event_id)) {
  console.log(`[Idempotency Layer 1] Duplicate webhook ${event.event_id} ignored.`);
  return { auditEntry: lastAudit, subCase: existingCase, isDuplicate: true };
}
this.processedWebhooks.add(event.event_id);
```

### Layer 2: Action Execution Deduplication

**What it does:** Prevents policy decisions from being applied multiple times

**How it works:**
```
After policy evaluation, generate idempotencyKey = "sub_xyz:stage_t1_pending"
├─ Check: Is sub_xyz:stage_t1_pending in executedActionKeys set?
├─ YES → Skip action dispatch (isDuplicate: true)
└─ NO → Dispatch action and store key in set
```

**Idempotency key format:** `{subscription_id}:{stage}`

**Examples:**
- `sub_live_abc123:stage_0_pending`
- `sub_live_def456:stage_t1_pending`
- `sub_live_ghi789:stage_t2_pending`
- `sub_live_jkl012:stage_halted_0`

**Storage:**
- In-memory `Set<string>` for speed
- Persisted to SQLite via `RecoveryStore`
- 30-day TTL for memory cleanup (case lifecycle)

**Code in engine.ts (line 619):**
```typescript
const idempotencyKey = `${event.subscription_id}:${targetStage}`;
const isActionDuplicate = this.executedActionKeys.has(idempotencyKey);
if (!isActionDuplicate) {
  this.executedActionKeys.add(idempotencyKey);
}
```

## Data Flow

### Webhook Reception (API endpoint: `/api/trigger/event`)

```
┌─ Webhook arrives
├─ Extract event_id from webhook
├─ Layer 1 Check: processedWebhooks.has(event_id)?
│  ├─ YES → Log duplicate, return cached audit entry
│  └─ NO → Continue processing
├─ Layer 1 Mark: processedWebhooks.add(event_id)
├─ Process webhook → create SubscriptionCase
├─ Determine target stage (stage_0_pending, stage_t1_pending, etc.)
├─ Layer 2 Key: Generate idempotencyKey = "sub_id:stage"
├─ Layer 2 Check: executedActionKeys.has(idempotencyKey)?
│  ├─ YES → Log duplicate, skip action dispatch
│  └─ NO → Continue to policy evaluation
├─ Layer 2 Mark: executedActionKeys.add(idempotencyKey)
├─ Run policy evaluation
├─ If decision is OUTBOUND → Dispatch to queue
├─ Create audit log entry
└─ Return { auditEntry, subCase, isDuplicate: false/true }
```

## Persistence

### Storage Format (SQLite)

**Table: `recovery_state`**
```sql
{
  "processedWebhooks": ["evt_xyz_1", "evt_xyz_2", "evt_xyz_3"],
  "executedActionKeys": ["sub_1:stage_0", "sub_2:stage_t1", "sub_3:stage_t2"],
  "cases": [...],
  "auditLogs": [...]
}
```

**Restore on startup (engine.ts line 92-107):**
```typescript
private restore(): void {
  const state = this.store?.load();
  this.processedWebhooks = new Set(state.processedWebhooks);
  this.executedActionKeys = new Set(state.executedActionKeys);
  // ... restore other state
}
```

## Memory Cleanup

### Webhook Cleanup (24-hour TTL)

```typescript
// Called periodically (e.g., once per day)
const cleaned = webhookLayer.cleanupExpired();
console.log(`Cleaned up ${cleaned} expired webhook entries`);
```

### Action Cleanup (30-day TTL)

```typescript
// Called periodically (e.g., once per week)
const cleaned = actionLayer.cleanupExpired();
console.log(`Cleaned up ${cleaned} expired action entries`);
```

## Testing Scenarios

### Scenario 1: Duplicate Webhook (Same event_id)

**Setup:**
- Send webhook with `event_id: "evt_duplicate_123"`

**First request:**
```bash
curl -X POST http://localhost:3000/api/trigger/event \
  -H "Content-Type: application/json" \
  -d '{"scenario": "soft_decline_restraint"}'
```
Response: `isDuplicate: false` ✓ Processed

**Retry (same webhook):**
```bash
# Same event_id automatically generated in scenario
```
Response: `isDuplicate: true` ✓ Duplicate detected

### Scenario 2: Same Subscription, Same Stage

**Setup:**
- Send two webhooks for same subscription
- Both evaluate to same stage (e.g., `stage_t1_pending`)

**First webhook:**
```
subscription_id: "sub_live_xyz"
Stage evaluation: stage_t1_pending
Key: "sub_live_xyz:stage_t1_pending"
Action dispatched: YES ✓
```

**Second webhook (retry):**
```
subscription_id: "sub_live_xyz"
Stage evaluation: stage_t1_pending
Key: "sub_live_xyz:stage_t1_pending"
Layer 2 check: DUPLICATE FOUND
Action dispatched: NO (cached) ✓
```

## API Response Format

```json
{
  "auditEntry": {
    "subscription_id": "sub_live_abc123",
    "decision": "SEND_CARD_UPDATE_LINK",
    "webhook_event_id": "evt_demo_soft_1725098734",
    "created_at": "2026-08-28T11:30:45Z"
  },
  "subCase": { /* full case data */ },
  "isDuplicate": false
}
```

When duplicate is detected:
```json
{
  "auditEntry": { /* previously cached entry */ },
  "subCase": { /* previously cached case */ },
  "isDuplicate": true  // Signal to client that this was a retry
}
```

## Metrics & Monitoring

### Get Idempotency Stats

```bash
curl http://localhost:3000/api/state | jq '.stats.idempotency'
```

Expected output:
```json
{
  "webhooksProcessed": 247,
  "actionsExecuted": 98,
  "estimatedMemory": "~48 KB"
}
```

## Edge Cases Handled

### 1. Network Retry (Same event_id, faster repeat)
✓ Handled by Layer 1 (webhook deduplication)

### 2. Late Duplicate (Same event_id, after 24 hours)
✓ Handled by Layer 1 (webhook stored for 24 hours)

### 3. Multiple Stages (Same subscription, different stages)
✓ Handled by Layer 2 (each stage is a different key)
Example:
- First webhook: "sub_123:stage_0" → executed
- Second webhook: "sub_123:stage_t1" → executed (different key)
- Third webhook (retry of second): "sub_123:stage_t1" → duplicate

### 4. Concurrent Webhook Delivery
✓ Handled by JavaScript single-threaded event loop
⚠️ Note: In production Node.js clusters, implement distributed idempotency

## Best Practices

### For Event Producers (Webhook senders)
1. **Always generate unique `event_id`** (UUIDv4 recommended)
2. **Use sequential timestamps** if not using UUIDs: `evt_${timestamp}_${random}`
3. **Send idempotent requests** (safe to retry)
4. **Include all context** in webhook payload

### For Event Consumers (RevRecover)
1. **Trust Layer 1 for webhook deduplication**
   - Don't add duplicate logic at database layer (redundant)
2. **Trust Layer 2 for action deduplication**
   - Safe to call policy evaluation multiple times
   - Safe to call dispatch multiple times
3. **Return `isDuplicate` flag to client**
   - Helps client know if it was a retry
4. **Monitor cleanup metrics**
   - Ensure memory doesn't grow unbounded

## Implementation Details

### Why Two Layers?

**Layer 1 (Webhook):**
- Catches immediate retries from gateway
- Prevents duplicate case creation
- Fast (O(1) set lookup)

**Layer 2 (Action):**
- Catches retries after case already created
- Prevents duplicate policy execution
- Ensures idempotency across application boundaries

### Why Sets instead of Maps?

- **Sets**: O(1) lookup, minimal memory
- **Maps**: Would need timestamp tracking (heavier)
- **Cleanup**: Separate TTL logic removes stale entries

### Why Separate from Database?

- **In-memory**: Microsecond-fast responses
- **Database**: Slower (ms range), but persisted
- **Hybrid approach**: Best of both worlds
  - Fast queries from memory
  - Persistence to SQLite for recovery

## Future Enhancements

### 1. Distributed Idempotency (Multi-instance)
```typescript
// Use Redis for distributed Sets
// Example: Use redis.get() instead of local Set.has()
```

### 2. Idempotency TTL Configuration
```typescript
// Allow custom TTL per event type
new IdempotencyManager({
  webhookTTL: 3600, // 1 hour
  actionTTL: 2592000, // 30 days
  cleanupInterval: 86400, // Daily cleanup
})
```

### 3. Idempotency Metrics Endpoint
```typescript
GET /api/admin/idempotency
→ {
    webhooksProcessed: 247,
    actionsExecuted: 98,
    lastCleanup: "2026-08-28T11:00:00Z",
    memory: { webhooks: 24000, actions: 16000 }
  }
```

### 4. Webhook Signature Validation
```typescript
// Add HMAC verification
verifyWebhookSignature(
  payload,
  signature,
  secret
) → boolean
```

## References

- **Webhook Event Model**: `server/engine.ts` line 516-540
- **Audit Log Format**: `types.ts` AuditLogEntry interface
- **Database Persistence**: `db/attribution.ts`, `server/store.ts`
- **Policy Evaluation**: `server/engine.ts` line 293-514

## Questions & Troubleshooting

### Q: Why is my webhook being marked as duplicate?
**A:** Check the `event_id` field. If it's the same, it's a genuine retry. If different, there's a bug in event_id generation.

### Q: Can I manually reset idempotency?
**A:** Not in production. For development, call `globalEngine.reset()` which clears all state.

### Q: What if I need to reprocess a webhook?
**A:** Change the `event_id` and resubmit. The original event_id identifies it as a duplicate.

### Q: Does idempotency work across server restarts?
**A:** Yes. State is persisted to SQLite and restored on startup via `restore()` method.

---

**Status**: ✅ Implemented & Tested  
**Last Updated**: 2026-08-28  
**Maintainer**: RevRecover Team
