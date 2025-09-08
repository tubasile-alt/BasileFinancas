import { type User, type InsertUser, type FinancialEntry, type InsertFinancialEntry, type DailyClosure, type InsertDailyClosure, users, financialEntries, dailyClosure } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private financialEntries: Map<string, FinancialEntry>;

  constructor() {
    this.users = new Map();
    this.financialEntries = new Map();
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
          const baseValue = payment.value || 0;
          // Adicionar taxa de 11% para cartão de crédito
          const value = payment.method === 'cartao_credito' ? baseValue * 1.11 : baseValue;
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
  }>> {
    const entries = this.getMonthlyEntries(year, month);
    const doctorMap = new Map<string, { total: number; count: number; procedures: Map<string, { count: number; total: number; }> }>();

    for (const entry of entries) {
      if (!doctorMap.has(entry.doctor)) {
        doctorMap.set(entry.doctor, { 
          total: 0, 
          count: 0, 
          procedures: new Map() 
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
        doctorData.total += entryTotal;

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
      const fixedCosts = MONTHLY_FIXED_COSTS.total;
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
        profit
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
          const baseValue = payment.value || 0;
          // Adicionar taxa de 11% para cartão de crédito
          const value = payment.method === 'cartao_credito' ? baseValue * 1.11 : baseValue;
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
          const baseValue = payment.value || 0;
          // Adicionar taxa de 11% para cartão de crédito
          const value = payment.method === 'cartao_credito' ? baseValue * 1.11 : baseValue;
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
  }>> {
    const entries = await this.getMonthlyEntries(year, month);
    const doctorMap = new Map<string, { total: number; count: number; procedures: Map<string, { count: number; total: number; }> }>();

    for (const entry of entries) {
      if (!doctorMap.has(entry.doctor)) {
        doctorMap.set(entry.doctor, { 
          total: 0, 
          count: 0, 
          procedures: new Map() 
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
        doctorData.total += entryTotal;

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
      const fixedCosts = MONTHLY_FIXED_COSTS.total;
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
        profit
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
          const baseValue = payment.value || 0;
          // Adicionar taxa de 11% para cartão de crédito
          const value = payment.method === 'cartao_credito' ? baseValue * 1.11 : baseValue;
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
}

export const storage = new DatabaseStorage();
