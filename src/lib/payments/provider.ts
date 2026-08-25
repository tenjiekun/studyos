// Payment Provider Abstraction Layer
// Allows swapping providers without rewriting the app

export interface PlanConfig {
  plan_id: string;
  name: string;
  price_paise: number;
  currency: string;
  duration_days: number;
}

export interface CreateOrderParams {
  userId: string;
  plan: PlanConfig;
  internalOrderId: string;
}

export interface CreateOrderResult {
  providerOrderId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentDetails {
  providerTransactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  method: string;
  status: "successful" | "failed" | "pending";
  fee?: number;
  tax?: number;
  net?: number;
}

export interface WebhookVerification {
  verified: boolean;
  eventType: string;
  eventId: string;
  payload: Record<string, unknown>;
}

export interface PaymentProvider {
  name: string;
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  fetchPaymentStatus(providerOrderId: string): Promise<PaymentDetails | null>;
  verifyWebhookSignature(body: string, headers: Record<string, string | null>): WebhookVerification;
  getOrderPayments(providerOrderId: string): Promise<PaymentDetails[]>;
}

// Provider registry
const providers: Record<string, PaymentProvider> = {};

export function registerProvider(name: string, provider: PaymentProvider) {
  providers[name] = provider;
}

export function getProvider(name: string): PaymentProvider | null {
  return providers[name] || null;
}

export function getDefaultProvider(): PaymentProvider | null {
  return providers["razorpay"] || null;
}
