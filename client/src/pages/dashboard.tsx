import { useState } from "react";
import { FinancialEntryForm } from "@/components/financial-entry-form";
import { EntriesTable } from "@/components/entries-table";
import { ErrorBoundary } from "@/components/error-boundary";
import { PatientSearchSection } from "@/components/patient-search-section";
import { MainNavigation } from "@/components/main-navigation";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorBoundary>
          <PatientSearchSection />
        </ErrorBoundary>
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
