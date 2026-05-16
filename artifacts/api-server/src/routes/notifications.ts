import { Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import {
  MarkNotificationReadParams,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router = Router();

function formatNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    message: n.message,
    recipient: n.recipient,
    type: n.type,
    date: n.date,
    is_read: n.is_read,
  };
}

router.get("/notifications", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.recipient, req.session.userId!))
    .orderBy(notificationsTable.created_at);

  res.json(notifications.map(formatNotification));
});

router.patch("/notifications/:id/read", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [notification] = await db
    .update(notificationsTable)
    .set({ is_read: true })
    .where(
      and(
        eq(notificationsTable.id, params.data.id),
        eq(notificationsTable.recipient, req.session.userId!),
      ),
    )
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json(formatNotification(notification));
});

router.patch("/notifications/read-all", requireAuth, async (req: Request, res: Response): Promise<void> => {
  await db
    .update(notificationsTable)
    .set({ is_read: true })
    .where(eq(notificationsTable.recipient, req.session.userId!));

  res.json({ success: true });
});

export default router;
