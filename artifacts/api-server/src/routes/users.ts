// import { Router, type Request, type Response } from "express";
// import { eq } from "drizzle-orm";
// import bcrypt from "bcryptjs";
// import { db, usersTable } from "@workspace/db";
// import {
//   GetUserParams,
//   UpdateUserParams,
//   UpdateUserBody,
//   DeleteUserParams,
//   CreateUserBody,
// } from "@workspace/api-zod";
// import { requireAuth } from "./auth";

// const router = Router();

// function formatUser(user: typeof usersTable.$inferSelect) {
//   return {
//     id: user.id,
//     username: user.username,
//     full_name: user.full_name,
//     role: user.role,
//     created_at: user.created_at.toISOString(),
//   };
// }

// router.get("/users", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   const users = await db.select().from(usersTable).orderBy(usersTable.created_at);
//   res.json(users.map(formatUser));
// });

// router.post("/users", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   const parsed = CreateUserBody.safeParse(req.body);
//   if (!parsed.success) {
//     res.status(400).json({ error: parsed.error.message });
//     return;
//   }

//   const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, parsed.data.username));
//   if (existing) {
//     res.status(400).json({ error: "Username already taken" });
//     return;
//   }

//   const hashed = await bcrypt.hash(parsed.data.password, 10);
//   const [user] = await db
//     .insert(usersTable)
//     .values({ ...parsed.data, password: hashed })
//     .returning();

//   res.status(201).json(formatUser(user));
// });

// router.get("/users/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   const params = GetUserParams.safeParse(req.params);
//   if (!params.success) {
//     res.status(400).json({ error: params.error.message });
//     return;
//   }

//   const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
//   if (!user) {
//     res.status(404).json({ error: "User not found" });
//     return;
//   }

//   res.json(formatUser(user));
// });

// router.patch("/users/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   const params = UpdateUserParams.safeParse(req.params);
//   if (!params.success) {
//     res.status(400).json({ error: params.error.message });
//     return;
//   }

//   const parsed = UpdateUserBody.safeParse(req.body);
//   if (!parsed.success) {
//     res.status(400).json({ error: parsed.error.message });
//     return;
//   }

//   const updates: Record<string, string> = {};
//   if (parsed.data.full_name) updates.full_name = parsed.data.full_name;
//   if (parsed.data.username) updates.username = parsed.data.username;
//   if (parsed.data.role) updates.role = parsed.data.role;
//   if (parsed.data.password) updates.password = await bcrypt.hash(parsed.data.password, 10);

//   const [user] = await db
//     .update(usersTable)
//     .set(updates)
//     .where(eq(usersTable.id, params.data.id))
//     .returning();

//   if (!user) {
//     res.status(404).json({ error: "User not found" });
//     return;
//   }

//   res.json(formatUser(user));
// });

// router.delete("/users/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
//   const params = DeleteUserParams.safeParse(req.params);
//   if (!params.success) {
//     res.status(400).json({ error: params.error.message });
//     return;
//   }

//   const [user] = await db
//     .delete(usersTable)
//     .where(eq(usersTable.id, params.data.id))
//     .returning();

//   if (!user) {
//     res.status(404).json({ error: "User not found" });
//     return;
//   }

//   res.json({ success: true });
// });

// export default router;
import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import {
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
  CreateUserBody,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "./auth";

const router = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    created_at: user.created_at.toISOString(),
  };
}

router.get("/users", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.created_at);
  res.json(users.map(formatUser));
});

router.post("/users", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, parsed.data.username));
  if (existing) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ ...parsed.data, password: hashed })
    .returning();

  res.status(201).json(formatUser(user));
});

router.get("/users/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.patch("/users/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, string> = {};
  if (parsed.data.full_name) updates.full_name = parsed.data.full_name;
  if (parsed.data.username) updates.username = parsed.data.username;
  if (parsed.data.role) updates.role = parsed.data.role;
  if (parsed.data.password) updates.password = await bcrypt.hash(parsed.data.password, 10);

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.delete("/users/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ success: true });
});

export default router;