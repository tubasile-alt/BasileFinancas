import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const financialEntries = pgTable("financial_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientName: text("patient_name").notNull(),
  patientCode: text("patient_code").notNull(),
  doctor: text("doctor").notNull(),
  procedure: text("procedure").notNull(),
  procedureValue: decimal("procedure_value", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  installments: integer("installments").notNull().default(1),
  invoiceRequested: boolean("invoice_requested").notNull().default(false),
  entryBy: text("entry_by").notNull(),
  entryDate: text("entry_date").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertFinancialEntrySchema = createInsertSchema(financialEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertFinancialEntry = z.infer<typeof insertFinancialEntrySchema>;
export type FinancialEntry = typeof financialEntries.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
