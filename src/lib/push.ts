// ---------------------------------------------------------------------------
// Web push notifications — VAPID-signed via `web-push`.
// ---------------------------------------------------------------------------
//
// Usage: call `initVapid()` once at process start, then `sendPushNotification`
// per subscription. Returns `false` when the subscription is dead (404/410)
// so the caller can null it in the DB and stop retrying.
// ---------------------------------------------------------------------------

import webPush from 'web-push';

let vapidReady = false;

export function initVapid(): void {
  if (vapidReady) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  if (!publicKey || !privateKey || !email) {
    throw new Error(
      'VAPID keys not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL.',
    );
  }

  webPush.setVapidDetails(email, publicKey, privateKey);
  vapidReady = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a push notification to a single subscription.
 *
 * @returns `true` on success, `false` if the subscription is expired/revoked
 *          (404/410 — caller should null it in DB). Throws on other errors.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  payload: PushPayload,
): Promise<boolean> {
  if (!vapidReady) initVapid();

  try {
    await webPush.sendNotification(
      subscription as unknown as webPush.PushSubscription,
      JSON.stringify(payload),
    );
    return true;
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // Subscription is dead — caller should null the DB row.
      return false;
    }
    throw error;
  }
}
