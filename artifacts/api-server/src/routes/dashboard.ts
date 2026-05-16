import { Router, type Request, type Response } from "express";
import { eq, and, lt, isNull, sql, count, desc } from "drizzle-orm";
import { db, tasksTable, usersTable, notificationsTable } from "@workspace/db";
import { requireAuth } from "./auth";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const isAdmin = req.session.role === "admin";

  const taskFilter = isAdmin
    ? undefined
    : eq(tasksTable.assigned_to, userId);

  const [totalTasks, pending, inProgress, completed, overdue, dueToday, noDeadline, unreadNotifications] =
    await Promise.all([
      db.select({ count: count() }).from(tasksTable).where(taskFilter).then((r) => r[0].count),
      db.select({ count: count() }).from(tasksTable).where(taskFilter ? and(taskFilter, eq(tasksTable.status, "pending")) : eq(tasksTable.status, "pending")).then((r) => r[0].count),
      db.select({ count: count() }).from(tasksTable).where(taskFilter ? and(taskFilter, eq(tasksTable.status, "in_progress")) : eq(tasksTable.status, "in_progress")).then((r) => r[0].count),
      db.select({ count: count() }).from(tasksTable).where(taskFilter ? and(taskFilter, eq(tasksTable.status, "completed")) : eq(tasksTable.status, "completed")).then((r) => r[0].count),
      db.select({ count: count() }).from(tasksTable).where(
        taskFilter
          ? and(taskFilter, lt(tasksTable.due_date, sql`CURRENT_DATE`), sql`${tasksTable.due_date} IS NOT NULL`)
          : and(lt(tasksTable.due_date, sql`CURRENT_DATE`), sql`${tasksTable.due_date} IS NOT NULL`)
      ).then((r) => r[0].count),
      db.select({ count: count() }).from(tasksTable).where(
        taskFilter
          ? and(taskFilter, eq(tasksTable.due_date, sql`CURRENT_DATE`))
          : eq(tasksTable.due_date, sql`CURRENT_DATE`)
      ).then((r) => r[0].count),
      db.select({ count: count() }).from(tasksTable).where(
        taskFilter
          ? and(taskFilter, isNull(tasksTable.due_date))
          : isNull(tasksTable.due_date)
      ).then((r) => r[0].count),
      db.select({ count: count() }).from(notificationsTable).where(
        and(eq(notificationsTable.recipient, userId), eq(notificationsTable.is_read, false))
      ).then((r) => r[0].count),
    ]);

  let totalEmployees: number | null = null;
  if (isAdmin) {
    const [emp] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "employee"));
    totalEmployees = emp.count;
  }

  res.json({
    total_tasks: totalTasks,
    pending,
    in_progress: inProgress,
    completed,
    overdue,
    due_today: dueToday,
    no_deadline: noDeadline,
    total_employees: totalEmployees,
    unread_notifications: unreadNotifications,
  });
});

router.get("/dashboard/activity", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.session.userId!;
  const isAdmin = req.session.role === "admin";

  const results = await db
    .select({
      task: tasksTable,
      user: usersTable,
    })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigned_to, usersTable.id))
    .where(isAdmin ? undefined : eq(tasksTable.assigned_to, userId))
    .orderBy(desc(tasksTable.updated_at))
    .limit(10);

  res.json(
    results.map(({ task, user }) => ({
      id: task.id,
      task_title: task.title,
      status: task.status,
      assigned_to_name: user?.full_name ?? null,
      updated_at: task.updated_at.toISOString(),
    })),
  );
});

export default router;
