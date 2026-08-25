// Payment Audit Log — records all important payment events

import { getServerSupabase } from "./server-db";

export type AuditEvent =
  | "order_created"
  | "checkout_initiated"
  | "payment_pending"
  | "payment_successful"
  | "payment_failed"
  | "webhook_received"
  | "webhook_verified"
  | "webhook_failed"
  | "entitlement_activated"
  | "entitlement_extended"
  | "refund_requested"
  | "refund_successful"
  | "settlement_recorded";

export async function logPaymentEvent(params: {
  userId?: string;
  orderId?: string;
  eventType: AuditEvent;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  const sb = getServerSupabase();
  if (!sb) return;

  await sb.from("payment_audit_log").insert({
    user_id: params.userId || null,
    order_id: params.orderId || null,
    event_type: params.eventType,
    details: params.details || {},
    ip_address: params.ipAddress || null,
  });
}
