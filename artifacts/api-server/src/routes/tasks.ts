// import { Router, type Request, type Response } from "express";
// import { eq, and, isNull, lt, lte, sql } from "drizzle-orm";
// import { db, tasksTable, usersTable, notificationsTable } from "@workspace/db";
// import {
//   GetTasksQueryParams,
//   GetTaskParams,
//   UpdateTaskParams,
//   UpdateTaskBody,
//   DeleteTaskParams,
//   UpdateTaskStatusParams,
//   UpdateTaskStatusBody,
//   GetMyTasksQueryParams,
//   CreateTaskBody,
// } from "@workspace/api-zod";
// import { requireAuth } from "./auth";

// const router = Router();

// function formatTask(task: typeof tasksTable.$inferSelect, assignedName?: string | null) {
//   return {
//     id: task.id,
//     title: task.title,
//     description: task.description ?? null,
//     assigned_to: task.assigned_to ?? null,
//     assigned_to_name: assignedName ?? null,
//     due_date: task.due_date ?? null,
//     status: task.status,
//     created_at: task.created_at.toISOString(),
//   };
// }

// async function getTasksWithUsers(conditions: Parameters<typeof db.select>[0] | undefined, statusFilter?: string, dueFilter?: string, assignedTo?: number | null) {
//   const query = db
//     .select({
//       task: tasksTable,
//       user: usersTable,
//     })
//     .from(tasksTable)
//     .leftJoin(usersTable, eq(tasksTable.assigned_to, usersTable.id));

//   const wheres = [];
//   if (statusFilter) wheres.push(eq(tasksTable.status, statusFilter));
//   if (dueFilter === "today") {
//     wheres.push(eq(tasksTable.due_date, sql`CURRENT_DATE`));
//   } else if (dueFilter === "overdue") {
//     wheres.push(lt(tasksTable.due_date, sql`CURRENT_DATE`));
//     wheres.push(sql`${tasksTable.due_date} IS NOT NULL`);
//   } else if (dueFilter === "no_deadline") {
//     wheres.push(isNull(tasksTable.due_date));
//   }
//   if (assignedTo != null) wheres.push(eq(tasksTable.assigned_to, assignedTo));

//   const results = wheres.length > 0
//     ? await query.where(and(...wheres))
//     : await query;

//   return results.map(({ task, user }) => formatTask(task, user?.full_name));
// }

// router.get("/tasks", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   const parsed = GetTasksQueryParams.safeParse(req.query);
//   if (!parsed.success) {
//     res.status(400).json({ error: parsed.error.message });
//     return;
//   }

//   const { status, due_filter, assigned_to } = parsed.data;
//   const tasks = await getTasksWithUsers(undefined, status, due_filter, assigned_to);
//   res.json(tasks);
// });

// router.post("/tasks", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   const parsed = CreateTaskBody.safeParse(req.body);
//   if (!parsed.success) {
//     res.status(400).json({ error: parsed.error.message });
//     return;
//   }

//   const [task] = await db.insert(tasksTable).values(parsed.data).returning();

//   // Send notification to assigned user
//   if (task.assigned_to) {
//     await db.insert(notificationsTable).values({
//       message: `You have been assigned a new task: "${task.title}"`,
//       recipient: task.assigned_to,
//       type: "task_assigned",
//       date: new Date().toISOString().split("T")[0],
//       is_read: false,
//     });
//   }

//   const [assignedUser] = task.assigned_to
//     ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigned_to))
//     : [];

//   res.status(201).json(formatTask(task, assignedUser?.full_name));
// });

// router.get("/tasks/my", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   const parsed = GetMyTasksQueryParams.safeParse(req.query);
//   if (!parsed.success) {
//     res.status(400).json({ error: parsed.error.message });
//     return;
//   }

//   const { status } = parsed.data;
//   const userId = req.session.userId!;
//   const tasks = await getTasksWithUsers(undefined, status, undefined, userId);
//   res.json(tasks);
// });

// router.get("/tasks/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   const params = GetTaskParams.safeParse(req.params);
//   if (!params.success) {
//     res.status(400).json({ error: params.error.message });
//     return;
//   }

//   const result = await db
//     .select({ task: tasksTable, user: usersTable })
//     .from(tasksTable)
//     .leftJoin(usersTable, eq(tasksTable.assigned_to, usersTable.id))
//     .where(eq(tasksTable.id, params.data.id));

//   if (!result[0]) {
//     res.status(404).json({ error: "Task not found" });
//     return;
//   }

//   res.json(formatTask(result[0].task, result[0].user?.full_name));
// });

// router.patch("/tasks/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   const params = UpdateTaskParams.safeParse(req.params);
//   if (!params.success) {
//     res.status(400).json({ error: params.error.message });
//     return;
//   }

//   const parsed = UpdateTaskBody.safeParse(req.body);
//   if (!parsed.success) {
//     res.status(400).json({ error: parsed.error.message });
//     return;
//   }

//   const [task] = await db
//     .update(tasksTable)
//     .set(parsed.data)
//     .where(eq(tasksTable.id, params.data.id))
//     .returning();

//   if (!task) {
//     res.status(404).json({ error: "Task not found" });
//     return;
//   }

//   const [assignedUser] = task.assigned_to
//     ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigned_to))
//     : [];

//   res.json(formatTask(task, assignedUser?.full_name));
// });

// router.patch("/tasks/:id/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   const params = UpdateTaskStatusParams.safeParse(req.params);
//   if (!params.success) {
//     res.status(400).json({ error: params.error.message });
//     return;
//   }

//   const parsed = UpdateTaskStatusBody.safeParse(req.body);
//   if (!parsed.success) {
//     res.status(400).json({ error: parsed.error.message });
//     return;
//   }

//   const [task] = await db
//     .update(tasksTable)
//     .set({ status: parsed.data.status })
//     .where(eq(tasksTable.id, params.data.id))
//     .returning();

//   if (!task) {
//     res.status(404).json({ error: "Task not found" });
//     return;
//   }

//   const [assignedUser] = task.assigned_to
//     ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigned_to))
//     : [];

//   res.json(formatTask(task, assignedUser?.full_name));
// });

// router.delete("/tasks/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   const params = DeleteTaskParams.safeParse(req.params);
//   if (!params.success) {
//     res.status(400).json({ error: params.error.message });
//     return;
//   }

//   const [task] = await db
//     .delete(tasksTable)
//     .where(eq(tasksTable.id, params.data.id))
//     .returning();

//   if (!task) {
//     res.status(404).json({ error: "Task not found" });
//     return;
//   }

//   res.json({ success: true });
// });

// export default router;
import { Router, type Request, type Response } from "express";
import { eq, and, isNull, lt, lte, sql } from "drizzle-orm";
import { db, tasksTable, usersTable, notificationsTable } from "@workspace/db";
import {
  GetTasksQueryParams,
  GetTaskParams,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
  UpdateTaskStatusParams,
  UpdateTaskStatusBody,
  GetMyTasksQueryParams,
  CreateTaskBody,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "./auth";

const router = Router();

function formatTask(task: typeof tasksTable.$inferSelect, assignedName?: string | null) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    assigned_to: task.assigned_to ?? null,
    assigned_to_name: assignedName ?? null,
    due_date: task.due_date ?? null,
    status: task.status,
    created_at: task.created_at.toISOString(),
  };
}

async function getTasksWithUsers(conditions: Parameters<typeof db.select>[0] | undefined, statusFilter?: string, dueFilter?: string, assignedTo?: number | null) {
  const query = db
    .select({
      task: tasksTable,
      user: usersTable,
    })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigned_to, usersTable.id));

  const wheres = [];
  if (statusFilter) wheres.push(eq(tasksTable.status, statusFilter));
  if (dueFilter === "today") {
    wheres.push(eq(tasksTable.due_date, sql`CURRENT_DATE`));
  } else if (dueFilter === "overdue") {
    wheres.push(lt(tasksTable.due_date, sql`CURRENT_DATE`));
    wheres.push(sql`${tasksTable.due_date} IS NOT NULL`);
  } else if (dueFilter === "no_deadline") {
    wheres.push(isNull(tasksTable.due_date));
  }
  if (assignedTo != null) wheres.push(eq(tasksTable.assigned_to, assignedTo));

  const results = wheres.length > 0
    ? await query.where(and(...wheres))
    : await query;

  return results.map(({ task, user }) => formatTask(task, user?.full_name));
}

router.get("/tasks", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = GetTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, due_filter, assigned_to } = parsed.data;
  const tasks = await getTasksWithUsers(undefined, status, due_filter, assigned_to);
  res.json(tasks);
});

router.post("/tasks", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db.insert(tasksTable).values(parsed.data).returning();

  // Send notification to assigned user
  if (task.assigned_to) {
    await db.insert(notificationsTable).values({
      message: `You have been assigned a new task: "${task.title}"`,
      recipient: task.assigned_to,
      type: "task_assigned",
      date: new Date().toISOString().split("T")[0],
      is_read: false,
    });
  }

  const [assignedUser] = task.assigned_to
    ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigned_to))
    : [];

  res.status(201).json(formatTask(task, assignedUser?.full_name));
});

router.get("/tasks/my", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = GetMyTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status } = parsed.data;
  const userId = req.session.userId!;
  const tasks = await getTasksWithUsers(undefined, status, undefined, userId);
  res.json(tasks);
});

router.get("/tasks/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await db
    .select({ task: tasksTable, user: usersTable })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigned_to, usersTable.id))
    .where(eq(tasksTable.id, params.data.id));

  if (!result[0]) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(formatTask(result[0].task, result[0].user?.full_name));
});

router.patch("/tasks/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set(parsed.data)
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const [assignedUser] = task.assigned_to
    ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigned_to))
    : [];

  res.json(formatTask(task, assignedUser?.full_name));
});

router.patch("/tasks/:id/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = UpdateTaskStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set({ status: parsed.data.status })
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const [assignedUser] = task.assigned_to
    ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigned_to))
    : [];

  res.json(formatTask(task, assignedUser?.full_name));
});

router.delete("/tasks/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json({ success: true });
});

export default router;