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

export const dailyClosure = pgTable("daily_closure", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  pixTotal: decimal("pix_total", { precision: 10, scale: 2 }).notNull().default("0"),
  creditCardTotal: decimal("credit_card_total", { precision: 10, scale: 2 }).notNull().default("0"),
  debitCardTotal: decimal("debit_card_total", { precision: 10, scale: 2 }).notNull().default("0"),
  cashTotal: decimal("cash_total", { precision: 10, scale: 2 }).notNull().default("0"),
  transferTotal: decimal("transfer_total", { precision: 10, scale: 2 }).notNull().default("0"),
  entriesCount: integer("entries_count").notNull(),
  closedBy: text("closed_by").notNull(),
  closedAt: timestamp("closed_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertDailyClosureSchema = createInsertSchema(dailyClosure).omit({
  id: true,
  closedAt: true,
});

export type InsertDailyClosure = z.infer<typeof insertDailyClosureSchema>;
export type DailyClosure = typeof dailyClosure.$inferSelect;

// Persistent Bank Transactions Table
export const bankTransactions = pgTable("bank_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dateISO: text("date_iso").notNull(),
  historico: text("historico").notNull(),
  documento: text("documento"),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  saldo: decimal("saldo", { precision: 10, scale: 2 }),
  categoria: text("categoria").notNull(),
  ehOperacional: integer("eh_operacional").notNull(), // 1 for true, 0 for false
  mes: integer("mes").notNull(),
  ano: integer("ano").notNull(),
  isoWeek: integer("iso_week").notNull(),
  source: text("source").notNull().default("bank_import"), // bank_import, manual, etc
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertBankTransactionPersistentSchema = createInsertSchema(bankTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertBankTransactionPersistent = z.infer<typeof insertBankTransactionPersistentSchema>;
export type BankTransactionPersistent = typeof bankTransactions.$inferSelect;

// Manual Expenses Table
export const manualExpenses = pgTable("manual_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dateISO: text("date_iso").notNull(),
  description: text("description").notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  categoria: text("categoria").notNull(),
  tipo: text("tipo").notNull(), // entrada, saida
  entryBy: text("entry_by").notNull(),
  observations: text("observations"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertManualExpenseSchema = createInsertSchema(manualExpenses).omit({
  id: true,
  createdAt: true,
});

export type InsertManualExpense = z.infer<typeof insertManualExpenseSchema>;
export type ManualExpense = typeof manualExpenses.$inferSelect;

// Bank Transaction Schemas (ephemeral types for processing only)

export const bankTransactionSchema = z.object({
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  historico: z.string().min(1, "Histórico é obrigatório"),
  documento: z.string().optional(),
  valor: z.number(),
  saldo: z.number().optional(),
});

export type BankTransaction = z.infer<typeof bankTransactionSchema>;

export const classifiedTransactionSchema = bankTransactionSchema.extend({
  categoria: z.string().min(1, "Categoria é obrigatória"),
  ehOperacional: z.boolean(),
  mes: z.number().min(1).max(12),
  ano: z.number().min(1900),
  isoWeek: z.number().min(1).max(53),
});

export type ClassifiedTransaction = z.infer<typeof classifiedTransactionSchema>;

// Report Schemas

export const operationalSummarySchema = z.object({
  entradasReais: z.number().min(0),
  saidasReais: z.number().min(0),
  saldoLiquido: z.number(),
  numEntradas: z.number().min(0),
  numSaidas: z.number().min(0),
});

export type OperationalSummary = z.infer<typeof operationalSummarySchema>;

export const categoryTotalSchema = z.object({
  categoria: z.string().min(1),
  valor: z.number(),
});

export type CategoryTotal = z.infer<typeof categoryTotalSchema>;

export const weeklyCashFlowSchema = z.object({
  semana: z.number().min(1).max(53),
  valor: z.number(),
});

export type WeeklyCashFlow = z.infer<typeof weeklyCashFlowSchema>;

export const topTransactionSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  historico: z.string().min(1),
  valor: z.number(),
  categoria: z.string().min(1),
});

export type TopTransaction = z.infer<typeof topTransactionSchema>;

// Insert schemas for ephemeral types (using the same pattern as database types)
export const insertBankTransactionSchema = bankTransactionSchema;
export const insertClassifiedTransactionSchema = classifiedTransactionSchema;
export const insertOperationalSummarySchema = operationalSummarySchema;
export const insertCategoryTotalSchema = categoryTotalSchema;
export const insertWeeklyCashFlowSchema = weeklyCashFlowSchema;
export const insertTopTransactionSchema = topTransactionSchema;

// Insert types
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type InsertClassifiedTransaction = z.infer<typeof insertClassifiedTransactionSchema>;
export type InsertOperationalSummary = z.infer<typeof insertOperationalSummarySchema>;
export type InsertCategoryTotal = z.infer<typeof insertCategoryTotalSchema>;
export type InsertWeeklyCashFlow = z.infer<typeof insertWeeklyCashFlowSchema>;
export type InsertTopTransaction = z.infer<typeof insertTopTransactionSchema>;

// Annual Dashboard Schemas

export const annualMonthSchema = z.object({
  month: z.number().min(1).max(12),
  entradas: z.number().min(0),
  saidas: z.number().min(0),
  net: z.number(),
});

export type AnnualMonth = z.infer<typeof annualMonthSchema>;

export const annualCategoryTotalSchema = z.object({
  categoria: z.string().min(1),
  entradas: z.number().min(0),
  saidas: z.number().min(0),
  net: z.number(),
});

export type AnnualCategoryTotal = z.infer<typeof annualCategoryTotalSchema>;

export const annualSpendResponseSchema = z.object({
  year: z.number().min(1900),
  months: z.array(annualMonthSchema),
  totals: z.object({
    entradas: z.number().min(0),
    saidas: z.number().min(0),
    net: z.number(),
  }),
  byCategory: z.array(annualCategoryTotalSchema),
});

export type AnnualSpendResponse = z.infer<typeof annualSpendResponseSchema>;

export const annualSpendQuerySchema = z.object({
  year: z.coerce.number().min(1900),
  categoria: z.string().optional(),
  tipo: z.enum(['entrada', 'saida']).optional(),
});

export type AnnualSpendQuery = z.infer<typeof annualSpendQuerySchema>;

// Insert schemas for annual types
export const insertAnnualMonthSchema = annualMonthSchema;
export const insertAnnualCategoryTotalSchema = annualCategoryTotalSchema;
export const insertAnnualSpendResponseSchema = annualSpendResponseSchema;
export const insertAnnualSpendQuerySchema = annualSpendQuerySchema;

// Insert types for annual schemas
export type InsertAnnualMonth = z.infer<typeof insertAnnualMonthSchema>;
export type InsertAnnualCategoryTotal = z.infer<typeof insertAnnualCategoryTotalSchema>;
export type InsertAnnualSpendResponse = z.infer<typeof insertAnnualSpendResponseSchema>;
export type InsertAnnualSpendQuery = z.infer<typeof insertAnnualSpendQuerySchema>;
