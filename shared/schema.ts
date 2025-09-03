import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const paymentDetailSchema = z.object({
  method: z.string(),
  value: z.number(),
  installments: z.number().optional(),
});

export type PaymentDetail = z.infer<typeof paymentDetailSchema>;

export const financialEntries = pgTable("financial_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientName: text("patient_name").notNull(),
  patientCode: text("patient_code").notNull(),
  doctor: text("doctor").notNull(),
  procedure: text("procedure").notNull(),
  procedureValue: decimal("procedure_value", { precision: 10, scale: 2 }).notNull(),
  paymentDetails: json("payment_details").$type<PaymentDetail[]>().notNull(),
  invoiceNumber: text("invoice_number"),
  observations: text("observations"),
  entryBy: text("entry_by").notNull(),
  entryDate: text("entry_date").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertFinancialEntrySchema = createInsertSchema(financialEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  paymentDetails: z.array(paymentDetailSchema).min(1, "Pelo menos um método de pagamento é obrigatório"),
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
