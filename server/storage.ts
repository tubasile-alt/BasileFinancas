import { type User, type InsertUser, type FinancialEntry, type InsertFinancialEntry, type DailyClosure, type InsertDailyClosure, type BankTransactionPersistent, type InsertBankTransactionPersistent, type ManualExpense, type InsertManualExpense, type LearnedClassification, type InsertLearnedClassification, type AnnualSpendResponse, type AnnualSpendQuery, users, financialEntries, dailyClosure, bankTransactions, manualExpenses, learnedClassifications } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, like, ilike, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { calculateProcedureCosts, MONTHLY_FIXED_COSTS } from "./procedure-costs";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createFinancialEntry(entry: InsertFinancialEntry): Promise<FinancialEntry>;
  getFinancialEntries(date?: string, doctor?: string): Promise<FinancialEntry[]>;
  getFinancialEntry(id: string): Promise<FinancialEntry | undefined>;
  updateFinancialEntry(id: string, entry: Partial<InsertFinancialEntry>): Promise<FinancialEntry | undefined>;
  deleteFinancialEntry(id: string): Promise<boolean>;
  getDailySummary(date: string): Promise<{
    total: number;
    pixTotal: number;
    creditCardTotal: number;
    debitCardTotal: number;
    cashTotal: number;
    transferTotal: number;
    count: number;
  }>;
  
  getMonthlyReport(year: number, month: number): Promise<{
    total: number;
    pixTotal: number;
    creditCardTotal: number;
    debitCardTotal: number;
    cashTotal: number;
    transferTotal: number;
    count: number;
    averagePerDay: number;
  }>;
  
  getMonthlyReportByDoctor(year: number, month: number): Promise<Array<{
    doctor: string;
    total: number;
    count: number;
    procedures: Array<{ procedure: string; count: number; total: number; }>;
    procedureCosts: number;
    fixedCosts: number;
    totalCosts: number;
    profit: number;
  }>>;
  
  getMonthlyReportByPaymentMethod(year: number, month: number): Promise<Array<{
    method: string;
    total: number;
    count: number;
    percentage: number;
  }>>;
  
  createDailyClosure(closure: InsertDailyClosure): Promise<DailyClosure>;
  getDailyClosure(date: string): Promise<DailyClosure | undefined>;
  
  getUniquePatients(searchTerm?: string): Promise<Array<{ patientName: string; patientCode: string; }>>;
  
  // Bank Transactions CRUD
  createBankTransaction(transaction: InsertBankTransactionPersistent): Promise<BankTransactionPersistent>;
  getBankTransactions(startDate?: string, endDate?: string, categoria?: string): Promise<BankTransactionPersistent[]>;
  getBankTransaction(id: string): Promise<BankTransactionPersistent | undefined>;
  updateBankTransaction(id: string, transaction: Partial<InsertBankTransactionPersistent>): Promise<BankTransactionPersistent | undefined>;
  deleteBankTransaction(id: string): Promise<boolean>;
  
  // Manual Expenses CRUD
  createManualExpense(expense: InsertManualExpense): Promise<ManualExpense>;
  getManualExpenses(startDate?: string, endDate?: string, categoria?: string, tipo?: string): Promise<ManualExpense[]>;
  getManualExpense(id: string): Promise<ManualExpense | undefined>;
  updateManualExpense(id: string, expense: Partial<InsertManualExpense>): Promise<ManualExpense | undefined>;
  deleteManualExpense(id: string): Promise<boolean>;
  
  // Annual Dashboard
  getAnnualSpend(params: AnnualSpendQuery): Promise<AnnualSpendResponse>;
  
  // Learned Classifications CRUD
  saveLearnedClassification(classification: InsertLearnedClassification): Promise<LearnedClassification>;
  getLearnedClassifications(): Promise<LearnedClassification[]>;
  findLearnedByHistorico(historico: string): Promise<LearnedClassification | undefined>;
  updateLearnedClassificationUsage(id: string): Promise<LearnedClassification | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private financialEntries: Map<string, FinancialEntry>;
  private bankTransactions: Map<string, BankTransactionPersistent>;
  private manualExpenses: Map<string, ManualExpense>;
  private learnedClassifications: Map<string, LearnedClassification>;

  constructor() {
    this.users = new Map();
    this.financialEntries = new Map();
    this.bankTransactions = new Map();
    this.manualExpenses = new Map();
    this.learnedClassifications = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createFinancialEntry(insertEntry: InsertFinancialEntry): Promise<FinancialEntry> {
    const id = randomUUID();
    const entry: FinancialEntry = { 
      ...insertEntry,
      observations: insertEntry.observations || null,
      invoiceNumber: insertEntry.invoiceNumber || null,
      id,
      createdAt: new Date()
    };
    this.financialEntries.set(id, entry);
    return entry;
  }

  async getFinancialEntries(date?: string, doctor?: string): Promise<FinancialEntry[]> {
    let entries = Array.from(this.financialEntries.values());
    
    if (date) {
      entries = entries.filter(entry => entry.entryDate === date);
    }
    
    if (doctor) {
      entries = entries.filter(entry => entry.doctor === doctor);
    }
    
    return entries.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getFinancialEntry(id: string): Promise<FinancialEntry | undefined> {
    return this.financialEntries.get(id);
  }

  async updateFinancialEntry(id: string, updateData: Partial<InsertFinancialEntry>): Promise<FinancialEntry | undefined> {
    const existing = this.financialEntries.get(id);
    if (!existing) return undefined;
    
    const updated: FinancialEntry = { ...existing, ...updateData };
    this.financialEntries.set(id, updated);
    return updated;
  }

  async deleteFinancialEntry(id: string): Promise<boolean> {
    return this.financialEntries.delete(id);
  }

  async getDailySummary(date: string): Promise<{
    total: number;
    pixTotal: number;
    creditCardTotal: number;
    debitCardTotal: number;
    cashTotal: number;
    transferTotal: number;
    count: number;
  }> {
    const entries = await this.getFinancialEntries(date);
    
    let total = 0;
    let pixTotal = 0;
    let creditCardTotal = 0;
    let debitCardTotal = 0;
    let cashTotal = 0;
    let transferTotal = 0;
    
    for (const entry of entries) {
      if (entry.paymentDetails && Array.isArray(entry.paymentDetails)) {
        for (const payment of entry.paymentDetails) {
          const value = payment.value || 0;
          total += value;
          
          switch (payment.method) {
            case 'pix':
              pixTotal += value;
              break;
            case 'cartao_credito':
              creditCardTotal += value;
              break;
            case 'cartao_debito':
              debitCardTotal += value;
              break;
            case 'dinheiro':
              cashTotal += value;
              break;
            case 'transferencia':
              transferTotal += value;
              break;
          }
        }
      }
    }
    
    return {
      total,
      pixTotal,
      creditCardTotal,
      debitCardTotal,
      cashTotal,
      transferTotal,
      count: entries.length
    };
  }

  async createDailyClosure(insertClosure: InsertDailyClosure): Promise<DailyClosure> {
    throw new Error("MemStorage does not support daily closures");
  }

  async getDailyClosure(date: string): Promise<DailyClosure | undefined> {
    throw new Error("MemStorage does not support daily closures");
  }

  async getMonthlyReport(year: number, month: number): Promise<{
    total: number;
    pixTotal: number;
    creditCardTotal: number;
    debitCardTotal: number;
    cashTotal: number;
    transferTotal: number;
    count: number;
    averagePerDay: number;
  }> {
    const entries = this.getMonthlyEntries(year, month);
    const summary = this.calculateSummaryFromEntries(entries);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    return {
      ...summary,
      averagePerDay: summary.total / daysInMonth
    };
  }

  async getMonthlyReportByDoctor(year: number, month: number): Promise<Array<{
    doctor: string;
    total: number;
    count: number;
    procedures: Array<{ procedure: string; count: number; total: number; }>;
    procedureCosts: number;
    fixedCosts: number;
    totalCosts: number;
    profit: number;
    cardTotal: number;
    nfTotal: number;
  }>> {
    const entries = this.getMonthlyEntries(year, month);
    const doctorMap = new Map<string, { 
      total: number; 
      count: number; 
      procedures: Map<string, { count: number; total: number; }>; 
      cardTotal: number;
      nfTotal: number;
    }>();

    for (const entry of entries) {
      if (!doctorMap.has(entry.doctor)) {
        doctorMap.set(entry.doctor, { 
          total: 0, 
          count: 0, 
          procedures: new Map(),
          cardTotal: 0,
          nfTotal: 0
        });
      }

      const doctorData = doctorMap.get(entry.doctor)!;
      doctorData.count++;

      if (entry.paymentDetails && Array.isArray(entry.paymentDetails)) {
        const entryTotal = entry.paymentDetails.reduce((sum, payment) => {
          const baseValue = payment.value || 0;
          const value = payment.method === 'cartao_credito' ? baseValue * 1.11 : baseValue;
          return sum + value;
        }, 0);
        
        // Calcular total de cartões (crédito e débito)
        const cardTotal = entry.paymentDetails.reduce((sum, payment) => {
          if (payment.method === 'cartao_credito' || payment.method === 'cartao_debito') {
            const baseValue = payment.value || 0;
            const value = payment.method === 'cartao_credito' ? baseValue * 1.11 : baseValue;
            return sum + value;
          }
          return sum;
        }, 0);
        
        doctorData.total += entryTotal;
        doctorData.cardTotal += cardTotal;
        
        // Se a entrada tem número de NF, adicionar ao total de NF
        if (entry.invoiceNumber && entry.invoiceNumber.trim()) {
          doctorData.nfTotal += entryTotal;
        }

        if (!doctorData.procedures.has(entry.procedure)) {
          doctorData.procedures.set(entry.procedure, { count: 0, total: 0 });
        }
        
        const procedureData = doctorData.procedures.get(entry.procedure)!;
        procedureData.count++;
        procedureData.total += entryTotal;
      }
    }

    return Array.from(doctorMap.entries()).map(([doctor, data]) => {
      const procedures = Array.from(data.procedures.entries()).map(([procedure, procData]) => ({
        procedure,
        count: procData.count,
        total: procData.total
      }));

      // Calcular custos dos procedimentos
      const procedureCosts = calculateProcedureCosts(procedures, doctor);
      // Fisioterapia não paga custos fixos (condomínio + centro cirúrgico)
      const fixedCosts = doctor === 'fisioterapia' ? 0 : MONTHLY_FIXED_COSTS.total;
      const totalCosts = procedureCosts + fixedCosts;
      const profit = data.total - totalCosts;

      return {
        doctor,
        total: data.total,
        count: data.count,
        procedures,
        procedureCosts,
        fixedCosts,
        totalCosts,
        profit,
        cardTotal: data.cardTotal,
        nfTotal: data.nfTotal
      };
    });
  }

  async getMonthlyReportByPaymentMethod(year: number, month: number): Promise<Array<{
    method: string;
    total: number;
    count: number;
    percentage: number;
  }>> {
    const entries = this.getMonthlyEntries(year, month);
    const methodMap = new Map<string, { total: number; count: number }>();
    let grandTotal = 0;

    for (const entry of entries) {
      if (entry.paymentDetails && Array.isArray(entry.paymentDetails)) {
        for (const payment of entry.paymentDetails) {
          const baseValue = payment.value || 0;
          const value = payment.method === 'cartao_credito' ? baseValue * 1.11 : baseValue;
          grandTotal += value;

          if (!methodMap.has(payment.method)) {
            methodMap.set(payment.method, { total: 0, count: 0 });
          }

          const methodData = methodMap.get(payment.method)!;
          methodData.total += value;
          methodData.count++;
        }
      }
    }

    return Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      total: data.total,
      count: data.count,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0
    }));
  }

  private getMonthlyEntries(year: number, month: number): FinancialEntry[] {
    const entries = Array.from(this.financialEntries.values());
    const paddedMonth = month.toString().padStart(2, '0');
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.entryDate);
      return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === month;
    });
  }

  private calculateSummaryFromEntries(entries: FinancialEntry[]): {
    total: number;
    pixTotal: number;
    creditCardTotal: number;
    debitCardTotal: number;
    cashTotal: number;
    transferTotal: number;
    count: number;
  } {
    let total = 0;
    let pixTotal = 0;
    let creditCardTotal = 0;
    let debitCardTotal = 0;
    let cashTotal = 0;
    let transferTotal = 0;
    
    for (const entry of entries) {
      if (entry.paymentDetails && Array.isArray(entry.paymentDetails)) {
        for (const payment of entry.paymentDetails) {
          const value = payment.value || 0;
          total += value;
          
          switch (payment.method) {
            case 'pix':
              pixTotal += value;
              break;
            case 'cartao_credito':
              creditCardTotal += value;
              break;
            case 'cartao_debito':
              debitCardTotal += value;
              break;
            case 'dinheiro':
              cashTotal += value;
              break;
            case 'transferencia':
              transferTotal += value;
              break;
          }
        }
      }
    }
    
    return {
      total,
      pixTotal,
      creditCardTotal,
      debitCardTotal,
      cashTotal,
      transferTotal,
      count: entries.length
    };
  }
  
  async getUniquePatients(searchTerm?: string): Promise<Array<{ patientName: string; patientCode: string; }>> {
    const entries = Array.from(this.financialEntries.values());
    const patientsMap = new Map<string, { patientName: string; patientCode: string; }>();
    
    entries.forEach(entry => {
      const key = `${entry.patientName}-${entry.patientCode}`;
      if (!patientsMap.has(key)) {
        patientsMap.set(key, {
          patientName: entry.patientName,
          patientCode: entry.patientCode
        });
      }
    });
    
    let patients = Array.from(patientsMap.values());
    
    if (searchTerm && searchTerm.length > 0) {
      patients = patients.filter(patient => 
        patient.patientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return patients
      .sort((a, b) => a.patientName.localeCompare(b.patientName))
      .slice(0, 10);
  }

  // Bank Transactions CRUD
  async createBankTransaction(insertTransaction: InsertBankTransactionPersistent): Promise<BankTransactionPersistent> {
    const id = randomUUID();
    const transaction: BankTransactionPersistent = {
      ...insertTransaction,
      documento: insertTransaction.documento || null,
      saldo: insertTransaction.saldo || null,
      source: insertTransaction.source || "bank_import",
      id,
      createdAt: new Date()
    };
    this.bankTransactions.set(id, transaction);
    return transaction;
  }

  async getBankTransactions(startDate?: string, endDate?: string, categoria?: string): Promise<BankTransactionPersistent[]> {
    let transactions = Array.from(this.bankTransactions.values());
    
    if (startDate) {
      transactions = transactions.filter(t => t.dateISO >= startDate);
    }
    
    if (endDate) {
      transactions = transactions.filter(t => t.dateISO <= endDate);
    }
    
    if (categoria) {
      transactions = transactions.filter(t => t.categoria === categoria);
    }
    
    return transactions.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getBankTransaction(id: string): Promise<BankTransactionPersistent | undefined> {
    return this.bankTransactions.get(id);
  }

  async updateBankTransaction(id: string, updateData: Partial<InsertBankTransactionPersistent>): Promise<BankTransactionPersistent | undefined> {
    const existing = this.bankTransactions.get(id);
    if (!existing) return undefined;
    
    const updated: BankTransactionPersistent = { ...existing, ...updateData };
    this.bankTransactions.set(id, updated);
    return updated;
  }

  async deleteBankTransaction(id: string): Promise<boolean> {
    return this.bankTransactions.delete(id);
  }

  // Manual Expenses CRUD
  async createManualExpense(insertExpense: InsertManualExpense): Promise<ManualExpense> {
    const id = randomUUID();
    const expense: ManualExpense = {
      ...insertExpense,
      observations: insertExpense.observations || null,
      id,
      createdAt: new Date()
    };
    this.manualExpenses.set(id, expense);
    return expense;
  }

  async getManualExpenses(startDate?: string, endDate?: string, categoria?: string, tipo?: string): Promise<ManualExpense[]> {
    let expenses = Array.from(this.manualExpenses.values());
    
    if (startDate) {
      expenses = expenses.filter(e => e.dateISO >= startDate);
    }
    
    if (endDate) {
      expenses = expenses.filter(e => e.dateISO <= endDate);
    }
    
    if (categoria) {
      expenses = expenses.filter(e => e.categoria === categoria);
    }
    
    if (tipo) {
      expenses = expenses.filter(e => e.tipo === tipo);
    }
    
    return expenses.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getManualExpense(id: string): Promise<ManualExpense | undefined> {
    return this.manualExpenses.get(id);
  }

  async updateManualExpense(id: string, updateData: Partial<InsertManualExpense>): Promise<ManualExpense | undefined> {
    const existing = this.manualExpenses.get(id);
    if (!existing) return undefined;
    
    const updated: ManualExpense = { ...existing, ...updateData };
    this.manualExpenses.set(id, updated);
    return updated;
  }

  async deleteManualExpense(id: string): Promise<boolean> {
    return this.manualExpenses.delete(id);
  }

  async getAnnualSpend(params: AnnualSpendQuery): Promise<AnnualSpendResponse> {
    const { year, categoria, tipo } = params;
    
    // Initialize months with zero values
    const monthsData: { [key: number]: { entradas: number; saidas: number; } } = {};
    for (let month = 1; month <= 12; month++) {
      monthsData[month] = { entradas: 0, saidas: 0 };
    }
    
    // Categories aggregation
    const categoriesData: { [key: string]: { entradas: number; saidas: number; } } = {};
    
    // Process bank transactions
    Array.from(this.bankTransactions.values()).forEach(transaction => {
      if (transaction.ano === year) {
        // Apply filters
        if (categoria && transaction.categoria !== categoria) return;
        
        const valor = parseFloat(transaction.valor);
        const isEntrada = valor >= 0;
        const tipoTransaction = isEntrada ? 'entrada' : 'saida';
        
        if (tipo && tipo !== tipoTransaction) return;
        
        const absValue = Math.abs(valor);
        const month = transaction.mes;
        
        // Add to monthly data
        if (isEntrada) {
          monthsData[month].entradas += absValue;
        } else {
          monthsData[month].saidas += absValue;
        }
        
        // Add to categories data
        if (!categoriesData[transaction.categoria]) {
          categoriesData[transaction.categoria] = { entradas: 0, saidas: 0 };
        }
        if (isEntrada) {
          categoriesData[transaction.categoria].entradas += absValue;
        } else {
          categoriesData[transaction.categoria].saidas += absValue;
        }
      }
    });
    
    // Process manual expenses
    Array.from(this.manualExpenses.values()).forEach(expense => {
      const expenseDate = new Date(expense.dateISO);
      if (expenseDate.getFullYear() === year) {
        // Apply filters
        if (categoria && expense.categoria !== categoria) return;
        if (tipo && expense.tipo !== tipo) return;
        
        const valor = parseFloat(expense.valor);
        const month = expenseDate.getMonth() + 1; // getMonth() returns 0-11
        
        // Add to monthly data
        if (expense.tipo === 'entrada') {
          monthsData[month].entradas += valor;
        } else {
          monthsData[month].saidas += valor;
        }
        
        // Add to categories data
        if (!categoriesData[expense.categoria]) {
          categoriesData[expense.categoria] = { entradas: 0, saidas: 0 };
        }
        if (expense.tipo === 'entrada') {
          categoriesData[expense.categoria].entradas += valor;
        } else {
          categoriesData[expense.categoria].saidas += valor;
        }
      }
    });
    
    // Build response
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const data = monthsData[month];
      return {
        month,
        entradas: data.entradas,
        saidas: data.saidas,
        net: data.entradas - data.saidas,
      };
    });
    
    const totals = months.reduce(
      (acc, month) => ({
        entradas: acc.entradas + month.entradas,
        saidas: acc.saidas + month.saidas,
        net: acc.net + month.net,
      }),
      { entradas: 0, saidas: 0, net: 0 }
    );
    
    const byCategory = Object.entries(categoriesData).map(([categoria, data]) => ({
      categoria,
      entradas: data.entradas,
      saidas: data.saidas,
      net: data.entradas - data.saidas,
    }));
    
    return {
      year,
      months,
      totals,
      byCategory,
    };
  }

  // Learned Classifications Methods
  async saveLearnedClassification(insertClassification: InsertLearnedClassification): Promise<LearnedClassification> {
    const id = randomUUID();
    const classification: LearnedClassification = {
      ...insertClassification,
      vezesAplicado: insertClassification.vezesAplicado ?? 1,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.learnedClassifications.set(id, classification);
    return classification;
  }

  async getLearnedClassifications(): Promise<LearnedClassification[]> {
    return Array.from(this.learnedClassifications.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async findLearnedByHistorico(historico: string): Promise<LearnedClassification | undefined> {
    // First try exact match
    const exactMatch = Array.from(this.learnedClassifications.values())
      .find(c => c.historico.toLowerCase() === historico.toLowerCase());
    
    if (exactMatch) {
      return exactMatch;
    }

    // Then try fuzzy matching for similarities > 85%
    const normalizedHistorico = historico.toLowerCase().trim();
    for (const classification of Array.from(this.learnedClassifications.values())) {
      const normalizedClassificationHistorico = classification.historico.toLowerCase().trim();
      const similarity = this.calculateStringSimilarity(normalizedHistorico, normalizedClassificationHistorico);
      if (similarity > 0.85) {
        return classification;
      }
    }

    return undefined;
  }

  async updateLearnedClassificationUsage(id: string): Promise<LearnedClassification | undefined> {
    const existing = this.learnedClassifications.get(id);
    if (!existing) return undefined;
    
    const updated: LearnedClassification = {
      ...existing,
      vezesAplicado: existing.vezesAplicado + 1,
      updatedAt: new Date(),
    };
    this.learnedClassifications.set(id, updated);
    return updated;
  }

  // Helper method for fuzzy matching
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
    if (len2 === 0) return 0.0;
    
    // Use Levenshtein distance for similarity calculation
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
    
    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    return 1.0 - (distance / maxLen);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createFinancialEntry(insertEntry: InsertFinancialEntry): Promise<FinancialEntry> {
    const [entry] = await db
      .insert(financialEntries)
      .values(insertEntry)
      .returning();
    return entry;
  }

  async getFinancialEntries(date?: string, doctor?: string): Promise<FinancialEntry[]> {
    const conditions = [];
    
    if (date) {
      conditions.push(eq(financialEntries.entryDate, date));
    }
    
    if (doctor) {
      conditions.push(eq(financialEntries.doctor, doctor));
    }
    
    const entries = conditions.length > 0 
      ? await db.select().from(financialEntries).where(and(...conditions))
      : await db.select().from(financialEntries);
    
    return entries.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getFinancialEntry(id: string): Promise<FinancialEntry | undefined> {
    const [entry] = await db.select().from(financialEntries).where(eq(financialEntries.id, id));
    return entry || undefined;
  }

  async updateFinancialEntry(id: string, updateData: Partial<InsertFinancialEntry>): Promise<FinancialEntry | undefined> {
    const [updated] = await db
      .update(financialEntries)
      .set(updateData)
      .where(eq(financialEntries.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteFinancialEntry(id: string): Promise<boolean> {
    const result = await db.delete(financialEntries).where(eq(financialEntries.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getDailySummary(date: string): Promise<{
    total: number;
    pixTotal: number;
    creditCardTotal: number;
    debitCardTotal: number;
    cashTotal: number;
    transferTotal: number;
    count: number;
  }> {
    const entries = await this.getFinancialEntries(date);
    
    let total = 0;
    let pixTotal = 0;
    let creditCardTotal = 0;
    let debitCardTotal = 0;
    let cashTotal = 0;
    let transferTotal = 0;
    
    for (const entry of entries) {
      if (entry.paymentDetails && Array.isArray(entry.paymentDetails)) {
        for (const payment of entry.paymentDetails) {
          const value = payment.value || 0;
          total += value;
          
          switch (payment.method) {
            case 'pix':
              pixTotal += value;
              break;
            case 'cartao_credito':
              creditCardTotal += value;
              break;
            case 'cartao_debito':
              debitCardTotal += value;
              break;
            case 'dinheiro':
              cashTotal += value;
              break;
            case 'transferencia':
              transferTotal += value;
              break;
          }
        }
      }
    }
    
    return {
      total,
      pixTotal,
      creditCardTotal,
      debitCardTotal,
      cashTotal,
      transferTotal,
      count: entries.length
    };
  }

  async createDailyClosure(insertClosure: InsertDailyClosure): Promise<DailyClosure> {
    const [closure] = await db
      .insert(dailyClosure)
      .values(insertClosure)
      .returning();
    return closure;
  }

  async getDailyClosure(date: string): Promise<DailyClosure | undefined> {
    const [closure] = await db.select().from(dailyClosure).where(eq(dailyClosure.date, date));
    return closure || undefined;
  }

  async getMonthlyReport(year: number, month: number): Promise<{
    total: number;
    pixTotal: number;
    creditCardTotal: number;
    debitCardTotal: number;
    cashTotal: number;
    transferTotal: number;
    count: number;
    averagePerDay: number;
  }> {
    const entries = await this.getMonthlyEntries(year, month);
    const summary = this.calculateSummaryFromEntries(entries);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    return {
      ...summary,
      averagePerDay: summary.total / daysInMonth
    };
  }

  async getMonthlyReportByDoctor(year: number, month: number): Promise<Array<{
    doctor: string;
    total: number;
    count: number;
    procedures: Array<{ procedure: string; count: number; total: number; }>;
    procedureCosts: number;
    fixedCosts: number;
    totalCosts: number;
    profit: number;
    cardTotal: number;
    nfTotal: number;
  }>> {
    const entries = await this.getMonthlyEntries(year, month);
    const doctorMap = new Map<string, { 
      total: number; 
      count: number; 
      procedures: Map<string, { count: number; total: number; }>; 
      cardTotal: number;
      nfTotal: number;
    }>();

    for (const entry of entries) {
      if (!doctorMap.has(entry.doctor)) {
        doctorMap.set(entry.doctor, { 
          total: 0, 
          count: 0, 
          procedures: new Map(),
          cardTotal: 0,
          nfTotal: 0
        });
      }

      const doctorData = doctorMap.get(entry.doctor)!;
      doctorData.count++;

      if (entry.paymentDetails && Array.isArray(entry.paymentDetails)) {
        const entryTotal = entry.paymentDetails.reduce((sum, payment) => {
          const baseValue = payment.value || 0;
          const value = payment.method === 'cartao_credito' ? baseValue * 1.11 : baseValue;
          return sum + value;
        }, 0);
        
        // Calcular total de cartões (crédito e débito)
        const cardTotal = entry.paymentDetails.reduce((sum, payment) => {
          if (payment.method === 'cartao_credito' || payment.method === 'cartao_debito') {
            const baseValue = payment.value || 0;
            const value = payment.method === 'cartao_credito' ? baseValue * 1.11 : baseValue;
            return sum + value;
          }
          return sum;
        }, 0);
        
        doctorData.total += entryTotal;
        doctorData.cardTotal += cardTotal;
        
        // Se a entrada tem número de NF, adicionar ao total de NF
        if (entry.invoiceNumber && entry.invoiceNumber.trim()) {
          doctorData.nfTotal += entryTotal;
        }

        if (!doctorData.procedures.has(entry.procedure)) {
          doctorData.procedures.set(entry.procedure, { count: 0, total: 0 });
        }
        
        const procedureData = doctorData.procedures.get(entry.procedure)!;
        procedureData.count++;
        procedureData.total += entryTotal;
      }
    }

    return Array.from(doctorMap.entries()).map(([doctor, data]) => {
      const procedures = Array.from(data.procedures.entries()).map(([procedure, procData]) => ({
        procedure,
        count: procData.count,
        total: procData.total
      }));

      // Calcular custos dos procedimentos
      const procedureCosts = calculateProcedureCosts(procedures, doctor);
      // Fisioterapia não paga custos fixos (condomínio + centro cirúrgico)
      const fixedCosts = doctor === 'fisioterapia' ? 0 : MONTHLY_FIXED_COSTS.total;
      const totalCosts = procedureCosts + fixedCosts;
      const profit = data.total - totalCosts;

      return {
        doctor,
        total: data.total,
        count: data.count,
        procedures,
        procedureCosts,
        fixedCosts,
        totalCosts,
        profit,
        cardTotal: data.cardTotal,
        nfTotal: data.nfTotal
      };
    });
  }

  async getMonthlyReportByPaymentMethod(year: number, month: number): Promise<Array<{
    method: string;
    total: number;
    count: number;
    percentage: number;
  }>> {
    const entries = await this.getMonthlyEntries(year, month);
    const methodMap = new Map<string, { total: number; count: number }>();
    let grandTotal = 0;

    for (const entry of entries) {
      if (entry.paymentDetails && Array.isArray(entry.paymentDetails)) {
        for (const payment of entry.paymentDetails) {
          const baseValue = payment.value || 0;
          const value = payment.method === 'cartao_credito' ? baseValue * 1.11 : baseValue;
          grandTotal += value;

          if (!methodMap.has(payment.method)) {
            methodMap.set(payment.method, { total: 0, count: 0 });
          }

          const methodData = methodMap.get(payment.method)!;
          methodData.total += value;
          methodData.count++;
        }
      }
    }

    return Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      total: data.total,
      count: data.count,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0
    }));
  }

  private async getMonthlyEntries(year: number, month: number): Promise<FinancialEntry[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    
    const entries = await db.select().from(financialEntries)
      .where(and(
        gte(financialEntries.entryDate, startDate),
        lte(financialEntries.entryDate, endDate)
      ));
    
    return entries;
  }

  private calculateSummaryFromEntries(entries: FinancialEntry[]): {
    total: number;
    pixTotal: number;
    creditCardTotal: number;
    debitCardTotal: number;
    cashTotal: number;
    transferTotal: number;
    count: number;
  } {
    let total = 0;
    let pixTotal = 0;
    let creditCardTotal = 0;
    let debitCardTotal = 0;
    let cashTotal = 0;
    let transferTotal = 0;
    
    for (const entry of entries) {
      if (entry.paymentDetails && Array.isArray(entry.paymentDetails)) {
        for (const payment of entry.paymentDetails) {
          const value = payment.value || 0;
          total += value;
          
          switch (payment.method) {
            case 'pix':
              pixTotal += value;
              break;
            case 'cartao_credito':
              creditCardTotal += value;
              break;
            case 'cartao_debito':
              debitCardTotal += value;
              break;
            case 'dinheiro':
              cashTotal += value;
              break;
            case 'transferencia':
              transferTotal += value;
              break;
          }
        }
      }
    }
    
    return {
      total,
      pixTotal,
      creditCardTotal,
      debitCardTotal,
      cashTotal,
      transferTotal,
      count: entries.length
    };
  }
  
  async getUniquePatients(searchTerm?: string): Promise<Array<{ patientName: string; patientCode: string; }>> {
    let query = db.select({
      patientName: financialEntries.patientName,
      patientCode: financialEntries.patientCode
    })
    .from(financialEntries)
    .groupBy(financialEntries.patientName, financialEntries.patientCode)
    .orderBy(financialEntries.patientName);
    
    if (searchTerm && searchTerm.length > 0) {
      query = query.where(
        ilike(financialEntries.patientName, `%${searchTerm}%`)
      ) as typeof query;
    }
    
    const result = await query.limit(10);
    return result;
  }

  // Bank Transactions CRUD
  async createBankTransaction(insertTransaction: InsertBankTransactionPersistent): Promise<BankTransactionPersistent> {
    const [transaction] = await db
      .insert(bankTransactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getBankTransactions(startDate?: string, endDate?: string, categoria?: string): Promise<BankTransactionPersistent[]> {
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(bankTransactions.dateISO, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(bankTransactions.dateISO, endDate));
    }
    
    if (categoria) {
      conditions.push(eq(bankTransactions.categoria, categoria));
    }
    
    const transactions = conditions.length > 0 
      ? await db.select().from(bankTransactions).where(and(...conditions))
      : await db.select().from(bankTransactions);
    
    return transactions.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getBankTransaction(id: string): Promise<BankTransactionPersistent | undefined> {
    const [transaction] = await db.select().from(bankTransactions).where(eq(bankTransactions.id, id));
    return transaction || undefined;
  }

  async updateBankTransaction(id: string, updateData: Partial<InsertBankTransactionPersistent>): Promise<BankTransactionPersistent | undefined> {
    const [updated] = await db
      .update(bankTransactions)
      .set(updateData)
      .where(eq(bankTransactions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBankTransaction(id: string): Promise<boolean> {
    const result = await db.delete(bankTransactions).where(eq(bankTransactions.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Manual Expenses CRUD
  async createManualExpense(insertExpense: InsertManualExpense): Promise<ManualExpense> {
    const [expense] = await db
      .insert(manualExpenses)
      .values(insertExpense)
      .returning();
    return expense;
  }

  async getManualExpenses(startDate?: string, endDate?: string, categoria?: string, tipo?: string): Promise<ManualExpense[]> {
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(manualExpenses.dateISO, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(manualExpenses.dateISO, endDate));
    }
    
    if (categoria) {
      conditions.push(eq(manualExpenses.categoria, categoria));
    }
    
    if (tipo) {
      conditions.push(eq(manualExpenses.tipo, tipo));
    }
    
    const expenses = conditions.length > 0 
      ? await db.select().from(manualExpenses).where(and(...conditions))
      : await db.select().from(manualExpenses);
    
    return expenses.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getManualExpense(id: string): Promise<ManualExpense | undefined> {
    const [expense] = await db.select().from(manualExpenses).where(eq(manualExpenses.id, id));
    return expense || undefined;
  }

  async updateManualExpense(id: string, updateData: Partial<InsertManualExpense>): Promise<ManualExpense | undefined> {
    const [updated] = await db
      .update(manualExpenses)
      .set(updateData)
      .where(eq(manualExpenses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteManualExpense(id: string): Promise<boolean> {
    const result = await db.delete(manualExpenses).where(eq(manualExpenses.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAnnualSpend(params: AnnualSpendQuery): Promise<AnnualSpendResponse> {
    const { year, categoria, tipo } = params;
    
    // Initialize months with zero values
    const monthsData: { [key: number]: { entradas: number; saidas: number; } } = {};
    for (let month = 1; month <= 12; month++) {
      monthsData[month] = { entradas: 0, saidas: 0 };
    }
    
    // Categories aggregation
    const categoriesData: { [key: string]: { entradas: number; saidas: number; } } = {};
    
    // Build conditions for bank transactions
    const bankConditions = [eq(bankTransactions.ano, year)];
    if (categoria) {
      bankConditions.push(eq(bankTransactions.categoria, categoria));
    }
    
    // Get bank transactions for the year
    const bankData = await db
      .select()
      .from(bankTransactions)
      .where(and(...bankConditions));
    
    // Process bank transactions
    bankData.forEach(transaction => {
      const valor = parseFloat(transaction.valor);
      const isEntrada = valor >= 0;
      const tipoTransaction = isEntrada ? 'entrada' : 'saida';
      
      if (tipo && tipo !== tipoTransaction) return;
      
      const absValue = Math.abs(valor);
      const month = transaction.mes;
      
      // Add to monthly data
      if (isEntrada) {
        monthsData[month].entradas += absValue;
      } else {
        monthsData[month].saidas += absValue;
      }
      
      // Add to categories data
      if (!categoriesData[transaction.categoria]) {
        categoriesData[transaction.categoria] = { entradas: 0, saidas: 0 };
      }
      if (isEntrada) {
        categoriesData[transaction.categoria].entradas += absValue;
      } else {
        categoriesData[transaction.categoria].saidas += absValue;
      }
    });
    
    // Build conditions for manual expenses
    const manualConditions = [
      gte(manualExpenses.dateISO, `${year}-01-01`),
      lte(manualExpenses.dateISO, `${year}-12-31`)
    ];
    if (categoria) {
      manualConditions.push(eq(manualExpenses.categoria, categoria));
    }
    if (tipo) {
      manualConditions.push(eq(manualExpenses.tipo, tipo));
    }
    
    // Get manual expenses for the year
    const manualData = await db
      .select()
      .from(manualExpenses)
      .where(and(...manualConditions));
    
    // Process manual expenses
    manualData.forEach(expense => {
      const expenseDate = new Date(expense.dateISO);
      const valor = parseFloat(expense.valor);
      const month = expenseDate.getMonth() + 1; // getMonth() returns 0-11
      
      // Add to monthly data
      if (expense.tipo === 'entrada') {
        monthsData[month].entradas += valor;
      } else {
        monthsData[month].saidas += valor;
      }
      
      // Add to categories data
      if (!categoriesData[expense.categoria]) {
        categoriesData[expense.categoria] = { entradas: 0, saidas: 0 };
      }
      if (expense.tipo === 'entrada') {
        categoriesData[expense.categoria].entradas += valor;
      } else {
        categoriesData[expense.categoria].saidas += valor;
      }
    });
    
    // Build response
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const data = monthsData[month];
      return {
        month,
        entradas: data.entradas,
        saidas: data.saidas,
        net: data.entradas - data.saidas,
      };
    });
    
    const totals = months.reduce(
      (acc, month) => ({
        entradas: acc.entradas + month.entradas,
        saidas: acc.saidas + month.saidas,
        net: acc.net + month.net,
      }),
      { entradas: 0, saidas: 0, net: 0 }
    );
    
    const byCategory = Object.entries(categoriesData).map(([categoria, data]) => ({
      categoria,
      entradas: data.entradas,
      saidas: data.saidas,
      net: data.entradas - data.saidas,
    }));
    
    return {
      year,
      months,
      totals,
      byCategory,
    };
  }

  // Learned Classifications Methods
  async saveLearnedClassification(insertClassification: InsertLearnedClassification): Promise<LearnedClassification> {
    const [classification] = await db
      .insert(learnedClassifications)
      .values(insertClassification)
      .returning();
    return classification;
  }

  async getLearnedClassifications(): Promise<LearnedClassification[]> {
    const classifications = await db
      .select()
      .from(learnedClassifications)
      .orderBy(learnedClassifications.createdAt);
    return classifications;
  }

  async findLearnedByHistorico(historico: string): Promise<LearnedClassification | undefined> {
    // First try exact match (case insensitive)
    const [exactMatch] = await db
      .select()
      .from(learnedClassifications)
      .where(ilike(learnedClassifications.historico, historico));
    
    if (exactMatch) {
      return exactMatch;
    }

    // For fuzzy matching, we'll need to get all classifications and do client-side matching
    // since SQL fuzzy matching is complex. For better performance, could implement using 
    // PostgreSQL extensions like pg_trgm in the future
    const allClassifications = await this.getLearnedClassifications();
    const normalizedHistorico = historico.toLowerCase().trim();
    
    for (const classification of allClassifications) {
      const normalizedClassificationHistorico = classification.historico.toLowerCase().trim();
      const similarity = this.calculateStringSimilarity(normalizedHistorico, normalizedClassificationHistorico);
      if (similarity > 0.85) {
        return classification;
      }
    }

    return undefined;
  }

  async updateLearnedClassificationUsage(id: string): Promise<LearnedClassification | undefined> {
    const [updated] = await db
      .update(learnedClassifications)
      .set({ 
        vezesAplicado: sql`${learnedClassifications.vezesAplicado} + 1`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(learnedClassifications.id, id))
      .returning();
    return updated || undefined;
  }

  // Helper method for fuzzy matching (same as MemStorage)
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
    if (len2 === 0) return 0.0;
    
    // Use Levenshtein distance for similarity calculation
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
    
    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    return 1.0 - (distance / maxLen);
  }
}

export const storage = new DatabaseStorage();
