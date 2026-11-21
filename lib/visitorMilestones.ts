import { Config } from "@/lib/appwriteConfig";
import { sendAdminPush } from "@/lib/adminPush";
import { serverDatabase } from "@/lib/serverAppwrite";
import { getTodayVercelVisitors } from "@/lib/vercelAnalytics";

const MILESTONE_SIZE = 50;

async function reserveMilestone(dateKey: string, milestone: number) {
  const documentId = `vm_${dateKey}_${milestone}`;
  try {
    await serverDatabase.createDocument(
      Config.databaseId,
      Config.eventsCollectionId,
      documentId,
      {
        type: "visitor_milestone",
        userId: "admin",
        sessionId: dateKey,
        metadata: JSON.stringify({ dateKey, milestone, source: "vercel" }),
        timestamp: new Date().toISOString(),
      },
    );
    return documentId;
  } catch (error: any) {
    if (Number(error?.code) === 409) return null;
    throw error;
  }
}

async function notifyMilestone(dateKey: string, count: number) {
  const milestone = Math.floor(count / MILESTONE_SIZE) * MILESTONE_SIZE;
  if (milestone < MILESTONE_SIZE) return { sent: false, milestone: 0 };

  const reservationId = await reserveMilestone(dateKey, milestone);
  if (!reservationId) return { sent: false, milestone };

  try {
    const delivery = await sendAdminPush({
      title: `${milestone} visitors today`,
      body: `BLING’D has reached ${milestone} unique visitors today. Open Analytics to see the activity.`,
      url: "/admin/analytics",
      tag: `storefront-visitors-${dateKey}-${milestone}`,
    });
    if (delivery.sent === 0) {
      await serverDatabase
        .deleteDocument(Config.databaseId, Config.eventsCollectionId, reservationId)
        .catch(() => null);
    }
    return { sent: delivery.sent > 0, milestone, delivery };
  } catch (error) {
    await serverDatabase
      .deleteDocument(Config.databaseId, Config.eventsCollectionId, reservationId)
      .catch(() => null);
    throw error;
  }
}

export async function checkVercelVisitorMilestone() {
  const { dateKey, count } = await getTodayVercelVisitors();
  const notification = await notifyMilestone(dateKey, count);
  return { count, notification };
}

export async function sendTodayVercelVisitorUpdate() {
  const { dateKey, count } = await getTodayVercelVisitors();
  const nextMilestone =
    (Math.floor(count / MILESTONE_SIZE) + 1) * MILESTONE_SIZE;
  const delivery = await sendAdminPush({
    title: `${count} visitor${count === 1 ? "" : "s"} today`,
    body: `BLING’D has had ${count} unique visitor${count === 1 ? "" : "s"} today. Next milestone: ${nextMilestone}.`,
    url: "/admin/analytics",
    tag: `storefront-visitors-today-${dateKey}`,
    renotify: true,
  });
  const reachedMilestone = Math.floor(count / MILESTONE_SIZE) * MILESTONE_SIZE;
  if (delivery.sent > 0 && reachedMilestone >= MILESTONE_SIZE)
    await reserveMilestone(dateKey, reachedMilestone);

  return { count, nextMilestone, delivery };
}
