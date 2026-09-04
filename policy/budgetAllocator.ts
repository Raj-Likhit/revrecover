/**
 * policy/budgetAllocator.ts
 * ---------------------------------------------------------------------------
 * Fixes: "Net-EV ranking and greedy daily budget allocation — Partial" gap.
 * Per comparison report: cases are currently processed in arrival order,
 * with no batch sort by net-EV-per-cost and no persisted allocation rank.
 *
 * Implements plan §5 exactly:
 *   "Allocate under a budget — sort by net_ev per unit cost, greedily fill
 *    daily contact capacity... Consolidate by customer... one message per
 *    customer per contact window."
 *
 * Call this once per batch/tick with every case that has already passed
 * the cost guardrail (net_ev > 0, cost_guardrail_passed = true) — this
 * function does allocation, not eligibility.
 */

import type { ScoredCase } from '../types';

export interface AllocationResult {
  case: ScoredCase;
  included: boolean;
  rank: number | null; // 1-based rank among included cases, null if excluded
  totalIncluded: number;
  reason: 'included' | 'excluded_by_budget' | 'excluded_customer_dedup';
}

export function rankAndAllocate(cases: ScoredCase[], opts: { dailyCapacity: number }): AllocationResult[] {
  const eligible = cases.filter((c) => c.costGuardrailPassed && c.netEvPaise > 0);

  // Sort by net_ev per unit cost, descending (plan §5).
  const sorted = [...eligible].sort((a, b) => {
    const scoreA = a.costPaise > 0 ? a.netEvPaise / a.costPaise : a.netEvPaise;
    const scoreB = b.costPaise > 0 ? b.netEvPaise / b.costPaise : b.netEvPaise;
    return scoreB - scoreA;
  });

  // Consolidate by customer: only the highest-ranked case per customer
  // survives this contact window (plan §5).
  const seenCustomers = new Set<string>();
  const deduped: ScoredCase[] = [];
  const dedupedOut: ScoredCase[] = [];
  for (const c of sorted) {
    if (seenCustomers.has(c.customerId)) {
      dedupedOut.push(c);
      continue;
    }
    seenCustomers.add(c.customerId);
    deduped.push(c);
  }

  const included = deduped.slice(0, opts.dailyCapacity);
  const excludedByBudget = deduped.slice(opts.dailyCapacity);

  const results: AllocationResult[] = [];
  included.forEach((c, i) => {
    results.push({ case: c, included: true, rank: i + 1, totalIncluded: included.length, reason: 'included' });
  });
  excludedByBudget.forEach((c) => {
    results.push({
      case: c,
      included: false,
      rank: null,
      totalIncluded: included.length,
      reason: 'excluded_by_budget',
    });
  });
  dedupedOut.forEach((c) => {
    results.push({
      case: c,
      included: false,
      rank: null,
      totalIncluded: included.length,
      reason: 'excluded_customer_dedup',
    });
  });

  return results;
}

/** Formats the audit-log string shown in plan §10: "included, rank 4 of 12". */
export function budgetAllocationLabel(r: AllocationResult): string {
  if (r.reason === 'included') return `included, rank ${r.rank} of ${r.totalIncluded}`;
  if (r.reason === 'excluded_customer_dedup') return 'excluded — customer already contacted this window';
  return 'excluded_by_budget';
}
