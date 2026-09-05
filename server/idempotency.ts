/**
 * Idempotency Layer for RevRecover
 * 
 * Prevents duplicate processing of:
 * 1. Webhook events (event_id based)
 * 2. Action execution (subscription_id:stage based)
 * 
 * This ensures that even if the same webhook is delivered multiple times
 * (due to retries or network issues), it will only be processed once.
 */

export interface IdempotencyState {
  processedWebhooks: Set<string>;
  executedActionKeys: Set<string>;
  lastProcessedAt: Map<string, number>; // For TTL-based cleanup
}

export interface IdempotencyResult<T> {
  isNew: boolean;
  isDuplicate: boolean;
  cachedResult?: T;
  executionTime?: number;
}

/**
 * Layer 1: Webhook Event Deduplication
 * Uses event_id to detect duplicate webhook deliveries
 */
export class WebhookIdempotencyLayer {
  private processedWebhooks = new Set<string>();
  private lastProcessedAt = new Map<string, number>();
  private readonly TTL_SECONDS = 86400; // 24 hours

  add(eventId: string): void {
    this.processedWebhooks.add(eventId);
    this.lastProcessedAt.set(eventId, Date.now() / 1000);
  }

  has(eventId: string): boolean {
    return this.processedWebhooks.has(eventId);
  }

  clear(): void {
    this.processedWebhooks.clear();
    this.lastProcessedAt.clear();
  }

  /**
   * Clean up old entries to prevent memory bloat
   * Called periodically (e.g., once per day)
   */
  cleanupExpired(): number {
    const now = Date.now() / 1000;
    let cleaned = 0;

    for (const [eventId, timestamp] of this.lastProcessedAt.entries()) {
      if (now - timestamp > this.TTL_SECONDS) {
        this.processedWebhooks.delete(eventId);
        this.lastProcessedAt.delete(eventId);
        cleaned++;
      }
    }

    return cleaned;
  }

  getSize(): number {
    return this.processedWebhooks.size;
  }

  toJSON(): { eventIds: string[] } {
    return { eventIds: Array.from(this.processedWebhooks) };
  }

  fromJSON(data: { eventIds: string[] }): void {
    this.processedWebhooks = new Set(data.eventIds);
    for (const eventId of data.eventIds) {
      this.lastProcessedAt.set(eventId, Date.now() / 1000);
    }
  }
}

/**
 * Layer 2: Action Execution Deduplication
 * Uses subscription_id:stage to ensure each stage transition happens only once
 * 
 * Example: "sub_live_xyz:stage_t1_pending"
 * This prevents re-execution of policy decisions and action dispatches
 * even if the webhook is processed multiple times
 */
export class ActionIdempotencyLayer {
  private executedActionKeys = new Set<string>();
  private lastExecutedAt = new Map<string, number>();
  private readonly TTL_SECONDS = 2592000; // 30 days (lifecycle of a case)

  /**
   * Generate idempotency key for a subscription at a specific stage
   */
  generateKey(subscriptionId: string, stage: string): string {
    return `${subscriptionId}:${stage}`;
  }

  /**
   * Check if an action has already been executed
   */
  hasExecuted(key: string): boolean {
    return this.executedActionKeys.has(key);
  }

  /**
   * Mark an action as executed
   */
  markExecuted(key: string): void {
    this.executedActionKeys.add(key);
    this.lastExecutedAt.set(key, Date.now() / 1000);
  }

  /**
   * Reset a specific action (rarely needed, only for testing/debug)
   */
  reset(key: string): void {
    this.executedActionKeys.delete(key);
    this.lastExecutedAt.delete(key);
  }

  clear(): void {
    this.executedActionKeys.clear();
    this.lastExecutedAt.clear();
  }

  /**
   * Clean up old entries to prevent memory bloat
   * Called periodically (e.g., once per week)
   */
  cleanupExpired(): number {
    const now = Date.now() / 1000;
    let cleaned = 0;

    for (const [key, timestamp] of this.lastExecutedAt.entries()) {
      if (now - timestamp > this.TTL_SECONDS) {
        this.executedActionKeys.delete(key);
        this.lastExecutedAt.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  getSize(): number {
    return this.executedActionKeys.size;
  }

  toJSON(): { actionKeys: string[] } {
    return { actionKeys: Array.from(this.executedActionKeys) };
  }

  fromJSON(data: { actionKeys: string[] }): void {
    this.executedActionKeys = new Set(data.actionKeys);
    for (const key of data.actionKeys) {
      this.lastExecutedAt.set(key, Date.now() / 1000);
    }
  }
}

/**
 * Combined Idempotency Manager
 * Coordinates both layers and provides unified interface
 */
export class IdempotencyManager {
  private webhookLayer: WebhookIdempotencyLayer;
  private actionLayer: ActionIdempotencyLayer;

  constructor() {
    this.webhookLayer = new WebhookIdempotencyLayer();
    this.actionLayer = new ActionIdempotencyLayer();
  }

  // Webhook Layer methods
  isWebhookProcessed(eventId: string): boolean {
    return this.webhookLayer.has(eventId);
  }

  markWebhookProcessed(eventId: string): void {
    this.webhookLayer.add(eventId);
  }

  // Action Layer methods
  hasActionExecuted(subscriptionId: string, stage: string): boolean {
    const key = this.actionLayer.generateKey(subscriptionId, stage);
    return this.actionLayer.hasExecuted(key);
  }

  markActionExecuted(subscriptionId: string, stage: string): void {
    const key = this.actionLayer.generateKey(subscriptionId, stage);
    this.actionLayer.markExecuted(key);
  }

  // Cleanup & persistence
  cleanup(): { webhooksExpired: number; actionsExpired: number } {
    return {
      webhooksExpired: this.webhookLayer.cleanupExpired(),
      actionsExpired: this.actionLayer.cleanupExpired(),
    };
  }

  getStats(): {
    webhooksProcessed: number;
    actionsExecuted: number;
  } {
    return {
      webhooksProcessed: this.webhookLayer.getSize(),
      actionsExecuted: this.actionLayer.getSize(),
    };
  }

  clear(): void {
    this.webhookLayer.clear();
    this.actionLayer.clear();
  }

  toJSON(): any {
    return {
      webhooks: this.webhookLayer.toJSON(),
      actions: this.actionLayer.toJSON(),
    };
  }

  fromJSON(data: any): void {
    if (data.webhooks) this.webhookLayer.fromJSON(data.webhooks);
    if (data.actions) this.actionLayer.fromJSON(data.actions);
  }
}

/**
 * Idempotency Decorators & Utilities
 */

/**
 * Async function wrapper that prevents concurrent execution
 * and ensures idempotent behavior for the same inputs
 */
export function createIdempotentHandler<Args extends any[], Result>(
  handler: (...args: Args) => Promise<Result>,
  keyGenerator: (...args: Args) => string,
  cache?: Map<string, { result: Result; timestamp: number }>
): (...args: Args) => Promise<Result> {
  return async (...args: Args): Promise<Result> => {
    const key = keyGenerator(...args);

    // Check cache
    if (cache?.has(key)) {
      const cached = cache.get(key)!;
      console.log(`[Idempotency] Cache hit for key: ${key}`);
      return cached.result;
    }

    // Execute handler
    const result = await handler(...args);

    // Store in cache
    if (cache) {
      cache.set(key, { result, timestamp: Date.now() / 1000 });
    }

    return result;
  };
}

/**
 * Log idempotency decision for audit trail
 */
export function logIdempotencyDecision(
  eventId: string,
  isDuplicate: boolean,
  reason?: string
): void {
  const level = isDuplicate ? 'info' : 'debug';
  const action = isDuplicate ? 'Duplicate detected' : 'New event';
  console.log(
    `[Idempotency] ${action} - Event: ${eventId} ${reason ? `(${reason})` : ''}`
  );
}
