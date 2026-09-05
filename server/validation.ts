/**
 * server/validation.ts
 * ---------------------------------------------------------------------------
 * Input validation utilities for API endpoints.
 * Provides type-safe validation with clear error messages.
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validatePositiveInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`, fieldName);
  }
  return value;
}

export function validateNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} must be a non-empty string`, fieldName);
  }
  return value.trim();
}

export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string
): T {
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName
    );
  }
  return value as T;
}

export function validateOptionalPositiveInteger(
  value: unknown,
  fieldName: string,
  defaultValue: number
): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return validatePositiveInteger(value, fieldName);
}

export function validateWebhookEvent(event: unknown): {
  event_id: string;
  event_type: string;
  subscription_id: string;
} {
  if (!event || typeof event !== 'object') {
    throw new ValidationError('Webhook payload must be an object');
  }

  const payload = event as Record<string, unknown>;

  // Extract subscription ID from multiple possible locations
  const razorpaySubscription = 
    payload.payload && 
    typeof payload.payload === 'object' && 
    'subscription' in payload.payload
      ? (payload.payload as Record<string, unknown>).subscription
      : undefined;

  const razorpayPayment = 
    payload.payload && 
    typeof payload.payload === 'object' && 
    'payment' in payload.payload
      ? (payload.payload as Record<string, unknown>).payment
      : undefined;

  const subscriptionEntity = 
    razorpaySubscription && 
    typeof razorpaySubscription === 'object' && 
    'entity' in razorpaySubscription
      ? (razorpaySubscription as Record<string, unknown>).entity
      : undefined;

  const paymentEntity = 
    razorpayPayment && 
    typeof razorpayPayment === 'object' && 
    'entity' in razorpayPayment
      ? (razorpayPayment as Record<string, unknown>).entity
      : undefined;

  const subscriptionId = 
    payload.subscription_id ||
    (subscriptionEntity && typeof subscriptionEntity === 'object' && 'id' in subscriptionEntity
      ? subscriptionEntity.id
      : undefined) ||
    (paymentEntity && typeof paymentEntity === 'object' && 'subscription_id' in paymentEntity
      ? paymentEntity.subscription_id
      : undefined);

  const eventType = payload.event_type || payload.event;
  const eventId = payload.event_id || payload.id;

  if (!eventType || typeof eventType !== 'string') {
    throw new ValidationError('event_type or event is required and must be a string', 'event_type');
  }

  if (!subscriptionId || typeof subscriptionId !== 'string') {
    throw new ValidationError('subscription_id is required and must be a string', 'subscription_id');
  }

  return {
    event_id: eventId && typeof eventId === 'string' 
      ? eventId 
      : `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    event_type: eventType,
    subscription_id: subscriptionId,
  };
}
