import { pgTable, text, varchar, serial, integer, date, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";
import { usersTable } from "./users";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  assigned_to: integer("assigned_to").references(() => usersTable.id, { onDelete: "set null" }),
  due_date: date("due_date"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaskSchema = z.object({
  title: z.string().max(100),
  description: z.string().nullable().optional(),
  assigned_to: z.number().int().nullable().optional(),
  due_date: z.string().optional(),
  status: z.string().max(20).optional(),
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;