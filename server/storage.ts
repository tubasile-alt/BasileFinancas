import { type User, type InsertUser, type FinancialEntry, type InsertFinancialEntry, users, financialEntries } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

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
}

export const storage = new DatabaseStorage();
