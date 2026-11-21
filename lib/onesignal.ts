export async function sendOneSignalNotification({
  title,
  message,
  playerIds,
  url,
  smallIcon
}: {
  title: string;
  message: string;
  playerIds: string[];
  url?: string;
  smallIcon?: string;
}) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    console.error('[OneSignal] Missing app ID or REST API key');
    return null;
  }

  const payload = {
    app_id: appId,
    contents: { en: message },
    headings: { en: title },
    include_player_ids: playerIds,
    priority: 10,
    ...(smallIcon && { small_icon: smallIcon }),
    ...(url && { url }),
  };

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OneSignal] API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('[OneSignal] Notification sent:', data);
    return data;
  } catch (error: any) {
    console.error('[OneSignal] Failed to send notification:', error);
    return null;
  }
}