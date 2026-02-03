import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const paymentDetailSchema = z.object({
  method: z.string(),
  value: z.number().transform((val) => Number(val.toFixed(2))),
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
  procedureValue: z.union([z.string(), z.number()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return Math.round(num * 100) / 100;
  }),
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

// Saved Monthly Reports Table
export const savedMonthlyReports = pgTable("saved_monthly_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mes: integer("mes").notNull(), // 1-12
  ano: integer("ano").notNull(), // 2024, 2025, etc
  nomeRelatorio: text("nome_relatorio").notNull(), // ex: "Janeiro 2025", "Março 2025"
  dataProcessamento: text("data_processamento").notNull(), // quando foi salvo (ISO string)
  
  // Dados completos salvos em JSON
  transactionsData: json("transactions_data").$type<ClassifiedTransaction[]>().notNull(),
  enhancedSummaryData: json("enhanced_summary_data").$type<EnhancedOperationalSummary>().notNull(),
  categoryReportData: json("category_report_data").$type<CategoryTotal[]>().notNull(),
  weeklyCashFlowData: json("weekly_cash_flow_data").$type<WeeklyCashFlow[]>().notNull(),
  topDespesasData: json("top_despesas_data").$type<TopTransaction[]>().notNull(),
  topReceitasData: json("top_receitas_data").$type<TopTransaction[]>().notNull(),
  
  // Metadados adicionais
  totalTransactions: integer("total_transactions").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertSavedMonthlyReportSchema = createInsertSchema(savedMonthlyReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedMonthlyReport = z.infer<typeof insertSavedMonthlyReportSchema>;
export type SavedMonthlyReport = typeof savedMonthlyReports.$inferSelect;

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

// Enhanced Report Schemas (for advanced classification system)

export const categorizedTransactionListSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  historico: z.string().min(1),
  valor: z.number(),
});

export type CategorizedTransactionList = z.infer<typeof categorizedTransactionListSchema>;

export const reviewQueueItemSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  historico: z.string().min(1),
  valor: z.number(),
  motivo: z.string().min(1),
});

export type ReviewQueueItem = z.infer<typeof reviewQueueItemSchema>;

export const categorizedTotalSchema = z.object({
  total: z.number(),
  lista: z.array(categorizedTransactionListSchema),
});

export type CategorizedTotal = z.infer<typeof categorizedTotalSchema>;

export const enhancedOperationalSummarySchema = z.object({
  // Campos existentes do OperationalSummary
  entradasReais: z.number().min(0),
  saidasReais: z.number().min(0),
  saldoLiquido: z.number(),
  numEntradas: z.number().min(0),
  numSaidas: z.number().min(0),
  
  // Novos campos obrigatórios
  impostos: categorizedTotalSchema,
  salariosConfirmados: categorizedTotalSchema,
  salariosHeuristicos: categorizedTotalSchema,
  movimentacoesFinanceiras: categorizedTotalSchema,
  filaRevisao: z.array(reviewQueueItemSchema),
});

export type EnhancedOperationalSummary = z.infer<typeof enhancedOperationalSummarySchema>;

export const annotatedTransactionSchema = classifiedTransactionSchema.extend({
  ehMovtoFinanceiro: z.boolean(),
  ehImposto: z.boolean(),
  ehSalarioPalavra: z.boolean(),
  ehSalarioHeuristico: z.boolean(),
  salarioConfirmado: z.boolean(),
  classificacaoFinal: z.string(),
  needsReview: z.boolean(),
});

export type AnnotatedTransaction = z.infer<typeof annotatedTransactionSchema>;

export const uxMessagesSchema = z.object({
  impostos: z.string(),
  salariosConfirmados: z.string(),
  salariosHeuristicos: z.string(),
  movimentacoesFinanceiras: z.string(),
  filaRevisao: z.string().optional(),
});

export type UXMessages = z.infer<typeof uxMessagesSchema>;

// Insert schemas for ephemeral types (using the same pattern as database types)
export const insertBankTransactionSchema = bankTransactionSchema;
export const insertClassifiedTransactionSchema = classifiedTransactionSchema;
export const insertOperationalSummarySchema = operationalSummarySchema;
export const insertCategoryTotalSchema = categoryTotalSchema;
export const insertWeeklyCashFlowSchema = weeklyCashFlowSchema;
export const insertTopTransactionSchema = topTransactionSchema;
export const insertCategorizedTransactionListSchema = categorizedTransactionListSchema;
export const insertReviewQueueItemSchema = reviewQueueItemSchema;
export const insertCategorizedTotalSchema = categorizedTotalSchema;
export const insertEnhancedOperationalSummarySchema = enhancedOperationalSummarySchema;
export const insertAnnotatedTransactionSchema = annotatedTransactionSchema;
export const insertUXMessagesSchema = uxMessagesSchema;

// Insert types
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type InsertClassifiedTransaction = z.infer<typeof insertClassifiedTransactionSchema>;
export type InsertOperationalSummary = z.infer<typeof insertOperationalSummarySchema>;
export type InsertCategoryTotal = z.infer<typeof insertCategoryTotalSchema>;
export type InsertWeeklyCashFlow = z.infer<typeof insertWeeklyCashFlowSchema>;
export type InsertTopTransaction = z.infer<typeof insertTopTransactionSchema>;
export type InsertCategorizedTransactionList = z.infer<typeof insertCategorizedTransactionListSchema>;
export type InsertReviewQueueItem = z.infer<typeof insertReviewQueueItemSchema>;
export type InsertCategorizedTotal = z.infer<typeof insertCategorizedTotalSchema>;
export type InsertEnhancedOperationalSummary = z.infer<typeof insertEnhancedOperationalSummarySchema>;
export type InsertAnnotatedTransaction = z.infer<typeof insertAnnotatedTransactionSchema>;
export type InsertUXMessages = z.infer<typeof insertUXMessagesSchema>;

// Employees Table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

// Learned Classifications Table
export const learnedClassifications = pgTable("learned_classifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  historico: text("historico").notNull(),
  categoria: text("categoria").notNull(),
  classificacaoFinal: text("classificacao_final").notNull(),
  ehOperacional: integer("eh_operacional").notNull(), // 1 for true, 0 for false
  dataAprendizado: text("data_aprendizado").notNull(),
  vezesAplicado: integer("vezes_aplicado").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertLearnedClassificationSchema = createInsertSchema(learnedClassifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLearnedClassification = z.infer<typeof insertLearnedClassificationSchema>;
export type LearnedClassification = typeof learnedClassifications.$inferSelect;

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

// Patients Table
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  firstConsultationDate: text("first_consultation_date").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

// Patient Evolutions Table (Timeline)
export const patientEvolutions = pgTable("patient_evolutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  evolutionDate: text("evolution_date").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertPatientEvolutionSchema = createInsertSchema(patientEvolutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPatientEvolution = z.infer<typeof insertPatientEvolutionSchema>;
export type PatientEvolution = typeof patientEvolutions.$inferSelect;
