import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import MonthlyDashboard from "@/pages/monthly-dashboard";
import GastosBasilePage from "@/pages/gastos-basile";
import IndividualControl from "@/pages/individual-control";
import ExtratoPage from "@/pages/extrato";
import PatientHistory from "@/pages/patient-history";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/monthly" component={MonthlyDashboard} />
      <Route path="/gastos" component={GastosBasilePage} />
      <Route path="/controle-individual" component={IndividualControl} />
      <Route path="/extrato" component={ExtratoPage} />
      <Route path="/pacientes/:id" component={PatientHistory} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
