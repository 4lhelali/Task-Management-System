import { pgTable, text, varchar, serial, integer, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";
import { usersTable } from "./users";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  recipient: integer("recipient").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  date: date("date").notNull().defaultNow(),
  is_read: boolean("is_read").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationSchema = z.object({
  message: z.string(),
  recipient: z.number().int(),
  type: z.string().max(50),
  date: z.string().optional(),
  is_read: z.boolean().optional(),
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;