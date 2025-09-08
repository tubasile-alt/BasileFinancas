import { useState } from "react";
import { FinancialEntryForm } from "@/components/financial-entry-form";
import { EntriesTable } from "@/components/entries-table";
import { ErrorBoundary } from "@/components/error-boundary";
import { Hospital } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Dashboard() {
  const [selectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Hospital className="h-6 w-6" />
              <h1 className="text-xl font-semibold">Clínica Basile - Controle Financeiro</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-primary-foreground/80">
                Hoje: {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <Link href="/monthly">
                <Button variant="outline" size="sm" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  Dashboard Mensal
                </Button>
              </Link>
              <div className="bg-primary-foreground/10 hover:bg-primary-foreground/20 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                <span data-testid="text-current-user">Sistema Clínica</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorBoundary>
          <FinancialEntryForm />
        </ErrorBoundary>
        <ErrorBoundary>
          <EntriesTable selectedDate={selectedDate} />
        </ErrorBoundary>
      </main>
    </div>
  );
}
