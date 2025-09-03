import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFinancialEntrySchema } from "@shared/schema";
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

  const httpServer = createServer(app);
  return httpServer;
}
