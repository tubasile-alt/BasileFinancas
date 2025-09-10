import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFinancialEntrySchema, insertBankTransactionPersistentSchema, insertManualExpenseSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Create financial entry
  app.post("/api/financial-entries", async (req, res) => {
    try {
      const validatedData = insertFinancialEntrySchema.parse(req.body);
      const entry = await storage.createFinancialEntry(validatedData);
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get financial entries with optional filters
  app.get("/api/financial-entries", async (req, res) => {
    try {
      const { date, doctor } = req.query;
      const entries = await storage.getFinancialEntries(
        date as string | undefined,
        doctor as string | undefined
      );
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get unique patients for autocomplete
  app.get("/api/unique-patients", async (req, res) => {
    try {
      const { search } = req.query;
      const patients = await storage.getUniquePatients(search as string | undefined);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching unique patients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single financial entry
  app.get("/api/financial-entries/:id", async (req, res) => {
    try {
      const entry = await storage.getFinancialEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update financial entry
  app.patch("/api/financial-entries/:id", async (req, res) => {
    try {
      const updateData = insertFinancialEntrySchema.partial().parse(req.body);
      const entry = await storage.updateFinancialEntry(req.params.id, updateData);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Delete financial entry
  app.delete("/api/financial-entries/:id", async (req, res) => {
    try {
      const success = await storage.deleteFinancialEntry(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.json({ message: "Entry deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get daily summary
  app.get("/api/daily-summary/:date", async (req, res) => {
    try {
      const summary = await storage.getDailySummary(req.params.date);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Daily closure routes
  app.post("/api/daily-closure", async (req, res) => {
    try {
      const summary = await storage.getDailySummary(req.body.date);
      const closure = await storage.createDailyClosure({
        date: req.body.date,
        totalAmount: summary.total.toString(),
        pixTotal: summary.pixTotal.toString(),
        creditCardTotal: summary.creditCardTotal.toString(),
        debitCardTotal: summary.debitCardTotal.toString(),
        cashTotal: summary.cashTotal.toString(),
        transferTotal: summary.transferTotal.toString(),
        entriesCount: summary.count,
        closedBy: req.body.closedBy
      });
      res.json(closure);
    } catch (error) {
      console.error("Error creating daily closure:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/daily-closure/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const closure = await storage.getDailyClosure(date);
      res.json(closure);
    } catch (error) {
      console.error("Error fetching daily closure:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Monthly reports endpoints
  app.get("/api/monthly-report/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month parameter" });
      }

      const report = await storage.getMonthlyReport(year, month);
      res.json(report);
    } catch (error) {
      console.error("Error fetching monthly report:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/monthly-report-by-doctor/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month parameter" });
      }

      const report = await storage.getMonthlyReportByDoctor(year, month);
      res.json(report);
    } catch (error) {
      console.error("Error fetching monthly report by doctor:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/monthly-report-by-payment/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month parameter" });
      }

      const report = await storage.getMonthlyReportByPaymentMethod(year, month);
      res.json(report);
    } catch (error) {
      console.error("Error fetching monthly report by payment method:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // BANK TRANSACTIONS ROUTES

  // Create bank transaction
  app.post("/api/bank-transactions", async (req, res) => {
    try {
      const validatedData = insertBankTransactionPersistentSchema.parse(req.body);
      const transaction = await storage.createBankTransaction(validatedData);
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get bank transactions with optional filters
  app.get("/api/bank-transactions", async (req, res) => {
    try {
      const { startDate, endDate, categoria } = req.query;
      const transactions = await storage.getBankTransactions(
        startDate as string | undefined,
        endDate as string | undefined,
        categoria as string | undefined
      );
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching bank transactions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single bank transaction
  app.get("/api/bank-transactions/:id", async (req, res) => {
    try {
      const transaction = await storage.getBankTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update bank transaction
  app.patch("/api/bank-transactions/:id", async (req, res) => {
    try {
      const updateData = insertBankTransactionPersistentSchema.partial().parse(req.body);
      const transaction = await storage.updateBankTransaction(req.params.id, updateData);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Delete bank transaction
  app.delete("/api/bank-transactions/:id", async (req, res) => {
    try {
      const success = await storage.deleteBankTransaction(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // MANUAL EXPENSES ROUTES

  // Create manual expense
  app.post("/api/manual-expenses", async (req, res) => {
    try {
      const validatedData = insertManualExpenseSchema.parse(req.body);
      const expense = await storage.createManualExpense(validatedData);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get manual expenses with optional filters
  app.get("/api/manual-expenses", async (req, res) => {
    try {
      const { startDate, endDate, categoria, tipo } = req.query;
      const expenses = await storage.getManualExpenses(
        startDate as string | undefined,
        endDate as string | undefined,
        categoria as string | undefined,
        tipo as string | undefined
      );
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching manual expenses:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single manual expense
  app.get("/api/manual-expenses/:id", async (req, res) => {
    try {
      const expense = await storage.getManualExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update manual expense
  app.patch("/api/manual-expenses/:id", async (req, res) => {
    try {
      const updateData = insertManualExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateManualExpense(req.params.id, updateData);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Delete manual expense
  app.delete("/api/manual-expenses/:id", async (req, res) => {
    try {
      const success = await storage.deleteManualExpense(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
