import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFinancialEntrySchema, insertBankTransactionPersistentSchema, insertManualExpenseSchema, insertLearnedClassificationSchema, annualSpendQuerySchema, insertSavedMonthlyReportSchema } from "@shared/schema";
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

  // Annual dashboard - get spend aggregation by year
  app.get("/api/annual-spend", async (req, res) => {
    try {
      const queryParams = annualSpendQuerySchema.parse(req.query);
      const annualData = await storage.getAnnualSpend(queryParams);
      res.json(annualData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error fetching annual spend data:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // LEARNED CLASSIFICATIONS ROUTES

  // Save a new learned classification
  app.post("/api/learned-classifications", async (req, res) => {
    try {
      const validatedData = insertLearnedClassificationSchema.parse(req.body);
      const classification = await storage.saveLearnedClassification(validatedData);
      res.json(classification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error saving learned classification:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get all learned classifications
  app.get("/api/learned-classifications", async (req, res) => {
    try {
      const classifications = await storage.getLearnedClassifications();
      res.json(classifications);
    } catch (error) {
      console.error("Error fetching learned classifications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Find learned classification by historico (exact and fuzzy matching)
  app.get("/api/learned-classifications/match", async (req, res) => {
    try {
      const { historico } = req.query;
      
      if (!historico || typeof historico !== 'string') {
        return res.status(400).json({ message: "Parameter 'historico' is required" });
      }

      const match = await storage.findLearnedByHistorico(historico);
      
      if (match) {
        // Update usage count when a match is found
        await storage.updateLearnedClassificationUsage(match.id);
        res.json(match);
      } else {
        res.status(404).json({ message: "No learned classification found for this historico" });
      }
    } catch (error) {
      console.error("Error finding learned classification:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // SAVED MONTHLY REPORTS ROUTES

  // Create saved monthly report
  app.post("/api/saved-monthly-reports", async (req, res) => {
    try {
      const validatedData = insertSavedMonthlyReportSchema.parse(req.body);
      const report = await storage.createSavedMonthlyReport(validatedData);
      res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating saved monthly report:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get all saved monthly reports
  app.get("/api/saved-monthly-reports", async (req, res) => {
    try {
      const reports = await storage.getSavedMonthlyReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching saved monthly reports:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get saved monthly report by period (year/month) - MUST come before :id route
  app.get("/api/saved-monthly-reports/period/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month parameter" });
      }

      const report = await storage.getSavedMonthlyReportByPeriod(month, year);
      if (!report) {
        return res.status(404).json({ message: "Saved monthly report not found for this period" });
      }
      res.json(report);
    } catch (error) {
      console.error("Error fetching saved monthly report by period:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single saved monthly report
  app.get("/api/saved-monthly-reports/:id", async (req, res) => {
    try {
      const report = await storage.getSavedMonthlyReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Saved monthly report not found" });
      }
      res.json(report);
    } catch (error) {
      console.error("Error fetching saved monthly report:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update saved monthly report
  app.patch("/api/saved-monthly-reports/:id", async (req, res) => {
    try {
      const updateData = insertSavedMonthlyReportSchema.partial().parse(req.body);
      const report = await storage.updateSavedMonthlyReport(req.params.id, updateData);
      if (!report) {
        return res.status(404).json({ message: "Saved monthly report not found" });
      }
      res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating saved monthly report:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Delete saved monthly report
  app.delete("/api/saved-monthly-reports/:id", async (req, res) => {
    try {
      const success = await storage.deleteSavedMonthlyReport(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Saved monthly report not found" });
      }
      res.json({ message: "Saved monthly report deleted successfully" });
    } catch (error) {
      console.error("Error deleting saved monthly report:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
