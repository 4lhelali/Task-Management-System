import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  LoginBody,
  SignupBody,
  UpdateProfileBody,
  GetMeResponse,
  UpdateProfileResponse,
} from "@workspace/api-zod";

const router = Router();

// Extend session type
declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

function requireAuth(req: Request, res: Response, next: () => void): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: () => void): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.session.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }
  next();
}

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));

  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  res.json({
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at.toISOString(),
    },
  });
});

router.post("/auth/signup", async (req: Request, res: Response): Promise<void> => {
  console.error("[SIGNUP] body received:", JSON.stringify(req.body));
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    console.error("[SIGNUP 400] zod errors:", JSON.stringify(parsed.error.issues));
    res.status(400).json({ error: parsed.error.message, issues: parsed.error.issues, receivedBody: req.body });
    return;
  }

  const { username, password, full_name, role = "employee" } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ username, password: hashed, full_name, role })
    .returning();

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  res.status(201).json({
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at.toISOString(),
    },
  });
});

router.post("/auth/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(
    GetMeResponse.parse({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at.toISOString(),
    }),
  );
});

router.patch("/auth/profile", async (req: Request, res: Response): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, string> = {};
  if (parsed.data.full_name) updates.full_name = parsed.data.full_name;
  if (parsed.data.password) updates.password = await bcrypt.hash(parsed.data.password, 10);

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.session.userId))
    .returning();

  res.json(
    UpdateProfileResponse.parse({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at.toISOString(),
    }),
  );
});

export { requireAuth, requireAdmin };
export default router;