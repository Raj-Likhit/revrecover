/**
 * db/experimentRuns.ts
 * ---------------------------------------------------------------------------
 * Fixes: "Transactional DB layer — experiment runs" gap, and the
 * reproducibility requirement in the acceptance checklist (§16):
 *   "The headline batch number is reproducible from a saved seed, input
 *    snapshot, policy version, and run ID."
 *
 * Call `saveExperimentRun` once, right after you compute the z-test /
 * sensitivity band for a batch (§11c/d), so the exact inputs behind a
 * headline number are pinned rather than re-derivable-in-theory.
 */

import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'crypto';
import { nowEpochSeconds } from './actionLedger';

export interface ExperimentRunInput {
  seed: number;
  policyVersion: string;
  inputBatch: unknown[]; // the exact synthetic batch (or live case set) the run was computed from
  treatmentCount: number;
  controlCount: number;
  zScore: number;
  pValue: number;
  headlineRecoveredPaise: number;
  sensitivity: { pessimistic: number; base: number; optimistic: number };
}

export function computeInputSnapshotHash(inputBatch: unknown[]): string {
  return createHash('sha256').update(JSON.stringify(inputBatch)).digest('hex');
}

export function saveExperimentRun(
  db: Database.Database,
  input: ExperimentRunInput,
  clock?: () => Date
): { runId: string } {
  const runId = randomUUID();
  db.prepare(`
    INSERT INTO experiment_runs (
      run_id, seed, policy_version, input_snapshot_hash, input_snapshot_json,
      created_at, treatment_count, control_count, z_score, p_value,
      headline_recovered_paise, sensitivity_json
    ) VALUES (@run_id, @seed, @policy_version, @input_snapshot_hash, @input_snapshot_json,
      @created_at, @treatment_count, @control_count, @z_score, @p_value,
      @headline_recovered_paise, @sensitivity_json)
  `).run({
    run_id: runId,
    seed: input.seed,
    policy_version: input.policyVersion,
    input_snapshot_hash: computeInputSnapshotHash(input.inputBatch),
    input_snapshot_json: JSON.stringify(input.inputBatch),
    created_at: nowEpochSeconds(clock),
    treatment_count: input.treatmentCount,
    control_count: input.controlCount,
    z_score: input.zScore,
    p_value: input.pValue,
    headline_recovered_paise: input.headlineRecoveredPaise,
    sensitivity_json: JSON.stringify(input.sensitivity),
  });
  return { runId };
}

export function getExperimentRun(db: Database.Database, runId: string) {
  const row = db.prepare(`SELECT * FROM experiment_runs WHERE run_id = ?`).get(runId) as any;
  if (!row) return undefined;
  return {
    ...row,
    input_snapshot_json: JSON.parse(row.input_snapshot_json),
    sensitivity_json: JSON.parse(row.sensitivity_json),
  };
}
