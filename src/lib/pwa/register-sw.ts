// ---------------------------------------------------------------------------
// PWA helpers — service worker registration + push subscription flow.
// ---------------------------------------------------------------------------

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration.scope);
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Convert a URL-safe base64 VAPID key to a Uint8Array for
 * `pushManager.subscribe({ applicationServerKey })`. Chrome/Firefox
 * accept the string directly on recent versions, but Safari still
 * needs the buffer form, so we always convert to be safe.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  // Allocate a fresh ArrayBuffer (not SharedArrayBuffer) to satisfy the
  // BufferSource type expected by PushManager.subscribe() in TS 5.7+.
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output as Uint8Array<ArrayBuffer>;
}

/**
 * Full opt-in flow:
 *   1. Register SW (no-op if already registered).
 *   2. Request notification permission (user gesture required).
 *   3. Subscribe via pushManager using the public VAPID key.
 *   4. POST the subscription JSON to /api/push/subscribe so the server
 *      can push to it from the nightly cron.
 *
 * Call this from a click handler (browsers require a user gesture).
 */
export async function enablePushNotifications(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'ssr' };
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported-browser' };
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return { ok: false, reason: 'missing-vapid-key' };
  }

  const permitted = await requestNotificationPermission();
  if (!permitted) {
    return { ok: false, reason: 'permission-denied' };
  }

  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.ready;
  } catch {
    return { ok: false, reason: 'sw-not-ready' };
  }

  let subscription: PushSubscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  } catch (err) {
    return {
      ok: false,
      reason: `subscribe-failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Persist server-side so the nightly notify script can reach this user.
  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, reason: `server-${res.status}: ${body.error ?? ''}` };
    }
  } catch (err) {
    return {
      ok: false,
      reason: `network: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return { ok: true };
}

/**
 * Revoke server-side and browser-side push subscription.
 */
export async function disablePushNotifications(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

  try {
    await fetch('/api/push/subscribe', { method: 'DELETE' });
  } catch {
    // Continue to unsubscribe browser-side even if server call fails.
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

/** @deprecated Use `enablePushNotifications()` — it also POSTs to the server. */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  } catch {
    return null;
  }
}
