/**
 * server/constants.ts
 * ---------------------------------------------------------------------------
 * Centralized constants extracted from magic values scattered across the codebase.
 * Behavior-preserving refactor - values unchanged, just named and organized.
 */

// Server Configuration
export const DEFAULT_PORT = 3000;
export const SERVER_HOST = '0.0.0.0';

// Batch Simulation Defaults
export const DEFAULT_BATCH_SIZE = 120;
export const DEFAULT_SEED = 20260828;

// Time Constants (in seconds unless specified)
export const HOURS_IN_SECONDS = 3600;
export const DAYS_IN_SECONDS = 86400;

// Quiet Hours (IST timezone)
export const QUIET_HOURS_START_HOUR = 9;  // 09:00 IST
export const QUIET_HOURS_END_HOUR = 20;   // 20:00 IST
export const IST_OFFSET_HOURS = 5.5;

// Contact Limits
export const DEFAULT_DAILY_CONTACT_CAPACITY = 80;
export const MAX_CONTACTS_PER_CUSTOMER_WINDOW = 1;

// Cost Guardrails (as percentage of transaction amount)
export const MAX_COST_PERCENTAGE = 0.05; // 5% of amount

// API Limits
export const DEFAULT_CASES_LIMIT = 100;
export const DEFAULT_AUDIT_LOGS_LIMIT = 50;
export const MAX_AUDIT_LOGS_LIMIT = 100;

// Razorpay Configuration
export const RAZORPAY_TIMEOUT_MS = 8000;
export const RAZORPAY_MAX_RETRIES = 1;

// Link Tracking Timeouts
export const LINK_ABANDONED_THRESHOLD_SECONDS = 86400; // 24 hours

// Default Mock Clock Time: 2026-08-28 11:30:00 IST (06:00:00 UTC)
export const DEFAULT_MOCKED_CLOCK_TIME = Math.floor(new Date('2026-08-28T06:00:00Z').getTime() / 1000);
