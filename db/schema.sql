-- schema.sql
-- ---------------------------------------------------------------------------
-- Normalized operational tables for RevRecover, replacing the single
-- serialized-engine-snapshot approach the comparison report flagged
-- ("not a normalized operational store... cannot query/retain experiment
-- runs independently"). Additive: run this alongside your existing snapshot
-- table, no need to touch it.
--
-- ADAPT: table/column names are free to rename as long as actionLedger.ts /
-- attribution.ts / experimentRuns.ts are updated to match.

CREATE TABLE IF NOT EXISTS actions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id   TEXT    NOT NULL,
  ladder_stage      TEXT    NOT NULL,
  action_type       TEXT    NOT NULL,              -- 'send_payment_link' | 'send_card_update_link' | ...
  status            TEXT    NOT NULL DEFAULT 'reserved', -- reserved | queued | dispatched | failed
  provider          TEXT,
  provider_ref_id   TEXT,                             -- Razorpay payment_link id / subscription id
  hosted_url        TEXT,
  idempotency_key   TEXT    NOT NULL,
  cost_paise        INTEGER NOT NULL DEFAULT 0,
  net_ev_paise      INTEGER NOT NULL DEFAULT 0,
  policy_version    TEXT    NOT NULL,
  arm               TEXT    NOT NULL,
  result_label      TEXT    NOT NULL DEFAULT 'simulated',
  dry_run           INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL,               -- epoch seconds
  dispatched_at     INTEGER,
  failure_reason    TEXT,
  UNIQUE(subscription_id, ladder_stage)              -- plan §5/§12: action-level idempotency
);

CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_subscription ON actions(subscription_id);

CREATE TABLE IF NOT EXISTS attribution_events (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id     TEXT    NOT NULL,
  payment_id          TEXT,
  event_type          TEXT    NOT NULL,             -- 'payment.captured' | 'subscription.charged'
  amount_paise        INTEGER NOT NULL,
  payment_route       TEXT,                          -- as reported by Razorpay / webhook payload
  occurred_at         INTEGER NOT NULL,
  matched_action_id   INTEGER REFERENCES actions(id),
  outcome             TEXT    NOT NULL,              -- direct | assisted | organic | unattributed
  matched_within_secs INTEGER
);

CREATE INDEX IF NOT EXISTS idx_attribution_subscription ON attribution_events(subscription_id);

CREATE TABLE IF NOT EXISTS experiment_runs (
  run_id                    TEXT PRIMARY KEY,
  seed                      INTEGER NOT NULL,
  policy_version            TEXT NOT NULL,
  input_snapshot_hash       TEXT NOT NULL,
  input_snapshot_json       TEXT NOT NULL,
  created_at                INTEGER NOT NULL,
  treatment_count           INTEGER NOT NULL,
  control_count             INTEGER NOT NULL,
  z_score                   REAL,
  p_value                   REAL,
  headline_recovered_paise  INTEGER,
  sensitivity_json          TEXT
);
