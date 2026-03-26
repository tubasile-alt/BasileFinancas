import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { insertFinancialEntrySchema, insertBankTransactionPersistentSchema, insertManualExpenseSchema, insertLearnedClassificationSchema, annualSpendQuerySchema, insertSavedMonthlyReportSchema, insertEmployeeSchema, insertPatientSchema, insertPatientEvolutionSchema, bankTransactions } from "@shared/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { syncToGoogleSheets, getSpreadsheetUrl } from "./googleSheetsSync";

// Default employees to load on startup
const DEFAULT_EMPLOYEES = [
  "FRANCIELE DE QUEIROZ BUEN",
  "DAIANE COSTA SANTOS",
  "IDALINA FRANCISCA RIBEIRO",
  "PALOMA CAMILA FERREIRA DA",
  "GRASIELLE CRISTINA DOS SA",
  "VANESSA DE MORAES POLVERI",
  "LAURA DE AGUIAR CAMPANINI",
  "CHRISTIANE MICHELLE DELLA",
  "MARCELLA CAVINATTO SALIBE",
  "GISELE CESCATE"
];

export async function registerRoutes(app: Express): Promise<Server> {
  const normalizeSignatureText = (value: string | null | undefined): string => {
    return (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  };

  const normalizeDocumento = (value: string | null | undefined): string => {
    const normalized = normalizeSignatureText(value);
    return normalized.replace(/[^\w]/g, "");
  };

  // Initialize default employees on startup
  const existingEmployees = await storage.getEmployees();
  if (existingEmployees.length === 0) {
    for (const employeeName of DEFAULT_EMPLOYEES) {
      await storage.createEmployee({ name: employeeName });
    }
  }

  // EMPLOYEES ROUTES
  app.post("/api/employees", async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const success = await storage.deleteEmployee(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

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

  // Get total to pay by month for entire year (consolidated from all doctors)
  app.get("/api/monthly-totals-to-pay/:year", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthData: any[] = [];
      
      // Get current date to limit months
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      
      // Only show months up to current month if year is current year
      const maxMonth = year === currentYear ? currentMonth : 12;

      for (let month = 1; month <= maxMonth; month++) {
        const doctorReports = await storage.getMonthlyReportByDoctor(year, month);
        
        let totalToPay = 0;
        doctorReports.forEach((doctor: any) => {
          if (doctor.doctor === 'fisioterapia') return;
          
          const baseCost = doctor.totalCosts || 0;
          const cardTax = doctor.doctor === 'icb-transplante' 
            ? 0 
            : (Math.max(doctor.cardTotal || 0, doctor.nfTotal || 0) * 0.11);
          
          totalToPay += baseCost + cardTax;
        });

        monthData.push({
          mes: month,
          label: monthNames[month - 1],
          total_a_pagar: totalToPay
        });
      }

      res.json(monthData);
    } catch (error) {
      console.error("Error in monthly totals to pay:", error);
      res.json([]);
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

  // Import bank transactions in batch with deduplication (idempotent by month/content)
  app.post("/api/bank-transactions/import", async (req, res) => {
    try {
      const validatedData = z.array(insertBankTransactionPersistentSchema).parse(req.body);

      if (validatedData.length === 0) {
        return res.json({
          inserted: 0,
          skipped: 0,
          totalReceived: 0,
          insertedTransactions: [],
        });
      }

      // Busca transações existentes no range mínimo/máximo do lote para deduplicação
      const sortedDates = validatedData
        .map(t => t.dateISO)
        .sort((a, b) => a.localeCompare(b));
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];
      const existingInRange = await storage.getBankTransactions(startDate, endDate);

      const buildSignature = (t: {
        dateISO: string;
        historico: string;
        documento?: string | null;
        valor: string | number;
        mes?: number | null;
        ano?: number | null;
      }) => {
        const historicoNorm = normalizeSignatureText(t.historico);
        const documentoNorm = normalizeDocumento(t.documento);
        const valorNorm = Number(t.valor).toFixed(2);
        const mesNorm = Number(t.mes || 0);
        const anoNorm = Number(t.ano || 0);
        return `${t.dateISO}|${historicoNorm}|${documentoNorm}|${valorNorm}|${anoNorm}-${mesNorm}`;
      };

      const existingSignatures = new Set(
        existingInRange.map(t => buildSignature(t))
      );
      const batchSignatures = new Set<string>();

      const toInsert = validatedData.filter((transaction) => {
        const signature = buildSignature(transaction);

        // Evita duplicação já existente no banco
        if (existingSignatures.has(signature)) {
          return false;
        }

        // Evita duplicação dentro do mesmo upload
        if (batchSignatures.has(signature)) {
          return false;
        }

        batchSignatures.add(signature);
        return true;
      });

      const insertedTransactions = [];
      for (const transaction of toInsert) {
        const created = await storage.createBankTransaction(transaction);
        insertedTransactions.push(created);
      }

      res.json({
        inserted: insertedTransactions.length,
        skipped: validatedData.length - insertedTransactions.length,
        totalReceived: validatedData.length,
        insertedTransactions,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error importing bank transactions:", error);
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

  // Get annual expenses summary for charts - de saved reports OU bank transactions
  app.get("/api/annual-expenses-summary", async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthData: Record<number, any> = {};
      
      // Inicializar todos os 12 meses
      for (let i = 1; i <= 12; i++) {
        monthData[i] = {
          mes: i,
          label: monthNames[i - 1],
          receita: 0,
          gasto: 0,
          impostos: 0,
          folha: 0,
          outros: 0
        };
      }
      
      // 1. Tentar carregar de saved monthly reports primeiro
      const reports = await storage.getSavedMonthlyReports();
      let hasData = false;
      const monthsWithSavedData = new Set<number>();
      
      reports.forEach((report: any) => {
        if (report.ano !== year) return;
        
        const mes = report.mes;
        if (!monthData[mes]) return;

        // Mês corrente permanece aberto para visualizar gasto parcial em tempo real
        const isOpenMonth = year === currentYear && mes === currentMonth;
        if (isOpenMonth) return;

        hasData = true;
        monthsWithSavedData.add(mes);
        
        try {
          const transactions = Array.isArray(report.transactionsData) ? report.transactionsData : 
                              (typeof report.transactionsData === 'string' ? JSON.parse(report.transactionsData) : []);
          
          const summary = typeof report.enhancedSummaryData === 'object' ? report.enhancedSummaryData : 
                         (typeof report.enhancedSummaryData === 'string' ? JSON.parse(report.enhancedSummaryData) : {});
          
          const categoryData = Array.isArray(report.categoryReportData) ? report.categoryReportData :
                              (typeof report.categoryReportData === 'string' ? JSON.parse(report.categoryReportData) : []);
          
          monthData[mes].receita = Math.abs(parseFloat(
            summary.entradasReais?.toString() ??
            summary.receitasRealizadas?.toString() ??
            "0"
          ));
          monthData[mes].gasto = Math.abs(parseFloat(summary.saidasReais?.toString() || "0"));
          
          const impostos = categoryData.filter((c: any) => 
            c.categoria?.toLowerCase().includes('imposto') ||
            c.categoria?.toLowerCase().includes('taxa')
          ).reduce((sum: number, c: any) => sum + Math.abs(parseFloat(c.valor?.toString() || "0")), 0);
          monthData[mes].impostos = impostos;
          
          const folha = categoryData.filter((c: any) => 
            c.categoria?.toLowerCase().includes('folha') ||
            c.categoria?.toLowerCase().includes('salár') ||
            c.categoria?.toLowerCase().includes('pagamento de pessoal')
          ).reduce((sum: number, c: any) => sum + Math.abs(parseFloat(c.valor?.toString() || "0")), 0);
          monthData[mes].folha = folha;
          monthData[mes].outros = Math.max(0, monthData[mes].gasto - impostos - folha);
          
        } catch (parseError) {
          console.error(`Erro ao processar relatório ${mes}/${year}:`, parseError);
        }
      });
      
      // 2. Usar bank_transactions para preencher meses sem relatório salvo
      if (!hasData || monthsWithSavedData.size < 12) {
        const bankTransactions = await storage.getBankTransactions();
        
        bankTransactions.forEach((t: any) => {
          if (parseInt(t.ano?.toString() || "0") !== year) return;
          
          const mes = parseInt(t.mes?.toString() || "0");
          if (mes < 1 || mes > 12 || !monthData[mes]) return;
          if (monthsWithSavedData.has(mes)) return;
          
          const valor = Math.abs(parseFloat(t.valor?.toString() || "0"));
          const categoria = (t.categoria?.toString() || "").toLowerCase();
          const isOperacional = t.ehOperacional === 1 || t.ehOperacional === true;
          
          // Receita ou Gasto
          if (parseFloat(t.valor?.toString() || "0") > 0) {
            monthData[mes].receita += valor;
          } else {
            monthData[mes].gasto += valor;
          }
          
          // Impostos
          if (categoria.includes('imposto') || categoria.includes('taxa')) {
            monthData[mes].impostos += valor;
          }
          
          // Folha
          if (categoria.includes('folha') || categoria.includes('salár') || categoria.includes('pagamento de pessoal')) {
            monthData[mes].folha += valor;
          }
        });
        
        // Calcular Outros após somar tudo
        Object.keys(monthData).forEach(mesStr => {
          const mes = parseInt(mesStr);
          monthData[mes].outros = Math.max(0, monthData[mes].gasto - monthData[mes].impostos - monthData[mes].folha);
        });
      }
      
      res.json(Object.values(monthData));
    } catch (error) {
      console.error("Error in annual summary:", error);
      res.json([]);
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

  // PATIENTS ROUTES
  // Create patient
  app.post("/api/patients", async (req, res) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating patient:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get all patients with optional search
  app.get("/api/patients", async (req, res) => {
    try {
      const searchTerm = req.query.search as string | undefined;
      const patients = await storage.getPatients(searchTerm);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single patient
  app.get("/api/patients/:id", async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update patient
  app.patch("/api/patients/:id", async (req, res) => {
    try {
      const updateData = insertPatientSchema.partial().parse(req.body);
      const patient = await storage.updatePatient(req.params.id, updateData);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating patient:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Delete patient
  app.delete("/api/patients/:id", async (req, res) => {
    try {
      const success = await storage.deletePatient(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json({ message: "Patient deleted successfully" });
    } catch (error) {
      console.error("Error deleting patient:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATIENT EVOLUTIONS ROUTES
  // Create evolution for patient
  app.post("/api/patients/:patientId/evolutions", async (req, res) => {
    try {
      const validatedData = insertPatientEvolutionSchema.parse({
        ...req.body,
        patientId: req.params.patientId,
      });
      const evolution = await storage.createPatientEvolution(validatedData);
      res.json(evolution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating patient evolution:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get evolutions for patient
  app.get("/api/patients/:patientId/evolutions", async (req, res) => {
    try {
      const evolutions = await storage.getPatientEvolutions(req.params.patientId);
      res.json(evolutions);
    } catch (error) {
      console.error("Error fetching patient evolutions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete evolution
  app.delete("/api/evolutions/:id", async (req, res) => {
    try {
      const success = await storage.deletePatientEvolution(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Evolution not found" });
      }
      res.json({ message: "Evolution deleted successfully" });
    } catch (error) {
      console.error("Error deleting evolution:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DELETE 2026 data from bank transactions (Gasto Anual only)
  app.delete("/api/admin/delete-year-2026", async (req, res) => {
    try {
      // Only delete from bank_transactions (which feeds Gasto Anual)
      // Do NOT delete from financial_entries
      const deleted = await db
        .delete(bankTransactions)
        .where(eq(bankTransactions.ano, 2026));
      
      res.json({ 
        success: true, 
        message: "Dados de 2026 removidos do Gasto Anual",
        deletedCount: deleted
      });
    } catch (error) {
      console.error("Error deleting 2026 data:", error);
      res.status(500).json({ message: String(error) });
    }
  });

  // GOOGLE SHEETS SYNC ROUTES
  // Get current spreadsheet URL (if exists)
  app.get("/api/google-sheets/status", async (req, res) => {
    try {
      const url = getSpreadsheetUrl();
      res.json({ url, connected: !!url });
    } catch (error) {
      console.error("Error getting Google Sheets status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trigger sync to Google Sheets
  app.post("/api/google-sheets/sync", async (req, res) => {
    try {
      const result = await syncToGoogleSheets();
      res.json(result);
    } catch (error) {
      console.error("Error syncing to Google Sheets:", error);
      res.status(500).json({ message: String(error) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
