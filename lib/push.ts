import webPush from "web-push";

export function initVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  if (!publicKey || !privateKey || !email) {
    throw new Error("VAPID keys not configured");
  }

  webPush.setVapidDetails(email, publicKey, privateKey);
}

export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  payload: { title: string; body: string; url?: string }
): Promise<boolean> {
  try {
    await webPush.sendNotification(
      subscription as unknown as webPush.PushSubscription,
      JSON.stringify(payload)
    );
    return true;
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      return false;
    }
    throw error;
  }
}
