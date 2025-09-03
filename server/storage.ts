import { type User, type InsertUser, type FinancialEntry, type InsertFinancialEntry } from "@shared/schema";
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
    cashTotal: number;
    transferTotal: number;
    count: number;
  }> {
    const entries = await this.getFinancialEntries(date);
    
    let total = 0;
    let pixTotal = 0;
    let creditCardTotal = 0;
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
      cashTotal,
      transferTotal,
      count: entries.length
    };
  }
}

export const storage = new MemStorage();
