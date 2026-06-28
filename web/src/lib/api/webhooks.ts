// SPDX-License-Identifier: ISC

import type { Webhook, WebhookEvent } from "./types";
import { sqlQuery, callReducer, genId } from "./client";
import { mapWebhook, mapWebhookEvent } from "./mappers";

export async function listWebhooks(): Promise<Webhook[]> {
  return sqlQuery("SELECT * FROM webhook")
    .then((rows) => (rows as any as unknown[][]).map(mapWebhook));
}

export async function getWebhook(id: string): Promise<Webhook | null> {
  return sqlQuery(`SELECT * FROM webhook WHERE id = '${id}'`).then(
    (rows) => ((rows as any as unknown[][])[0] ? mapWebhook((rows as any as unknown[][])[0]) : null),
  );
}

export async function createWebhook(name: string, url: string, events: string, secret: string, createdBy: string): Promise<string> {
  const id = genId("wh");
  return callReducer("create_webhook", [id, name, url, events, secret, createdBy]).then(() => id);
}

export async function updateWebhook(id: string, name: string, url: string, events: string, secret: string, isActive: boolean): Promise<void> {
  return callReducer("update_webhook", [id, name, url, events, secret, isActive]);
}

export async function deleteWebhook(id: string): Promise<void> {
  return callReducer("delete_webhook", [id]);
}

export async function getWebhookEvents(webhookId: string): Promise<WebhookEvent[]> {
  return sqlQuery(`SELECT * FROM webhook_event WHERE webhook_id = '${webhookId}' ORDER BY created_at DESC`)
    .then((rows) => (rows as any as unknown[][]).map(mapWebhookEvent));
}

export async function fireWebhookEvent(webhookId: string, eventType: string, pageId: string, payload: string): Promise<void> {
  const id = genId("wev");
  return callReducer("fire_webhook_event", [id, webhookId, eventType, pageId, payload]);
}

export async function markWebhookEventSent(id: string, responseCode: number, responseBody: string): Promise<void> {
  return callReducer("mark_webhook_event_sent", [id, responseCode, responseBody]);
}

export async function cleanupWebhookEvents(olderThanMs: number): Promise<void> {
  return callReducer("cleanup_webhook_events", [olderThanMs]);
}

// ── API section for the `api` object ──

export const webhooksApi = {
  list: listWebhooks,
  get: getWebhook,
  create: createWebhook,
  update: updateWebhook,
  delete: deleteWebhook,
  listEvents: getWebhookEvents,
  fire: fireWebhookEvent,
  markSent: markWebhookEventSent,
  cleanup: cleanupWebhookEvents,
};
