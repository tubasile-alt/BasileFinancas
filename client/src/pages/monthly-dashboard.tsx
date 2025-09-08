import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Hospital, TrendingUp, Users, DollarSign, Calendar, CreditCard } from "lucide-react";
import { Link } from "wouter";

interface MonthlyReportData {
  total: number;
  pixTotal: number;
  creditCardTotal: number;
  debitCardTotal: number;
  cashTotal: number;
  transferTotal: number;
  count: number;
  averagePerDay: number;
}

interface DoctorReportData {
  doctor: string;
  total: number;
  count: number;
  procedures: Array<{ procedure: string; count: number; total: number; }>;
  procedureCosts: number;
  fixedCosts: number;
  totalCosts: number;
  profit: number;
}

interface PaymentMethodReportData {
  method: string;
  total: number;
  count: number;
  percentage: number;
}

export default function MonthlyDashboard() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  // Fetch monthly report data
  const { data: monthlyReport, isLoading: isLoadingReport } = useQuery<MonthlyReportData>({
    queryKey: ["/api/monthly-report", selectedYear, selectedMonth],
    enabled: !!selectedYear && !!selectedMonth,
  });

  const { data: doctorReport, isLoading: isLoadingDoctor } = useQuery<DoctorReportData[]>({
    queryKey: ["/api/monthly-report-by-doctor", selectedYear, selectedMonth],
    enabled: !!selectedYear && !!selectedMonth,
  });

  const { data: paymentReport, isLoading: isLoadingPayment } = useQuery<PaymentMethodReportData[]>({
    queryKey: ["/api/monthly-report-by-payment", selectedYear, selectedMonth],
    enabled: !!selectedYear && !!selectedMonth,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i);

  const paymentMethodLabels: Record<string, string> = {
    'pix': 'PIX',
    'transferencia': 'Transferência',
    'cartao_credito': 'Cartão de Crédito',
    'cartao_debito': 'Cartão de Débito',
    'dinheiro': 'Dinheiro'
  };

  const doctorLabels: Record<string, string> = {
    'dr-filipe': 'Dr. Filipe',
    'dr-vinicius': 'Dr. Vinícius',
    'icb-transplante': 'ICB Transplante'
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Hospital className="h-6 w-6" />
              <h1 className="text-xl font-semibold">Clínica Basile - Dashboard Mensal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  Dashboard Diário
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
        {/* Filters */}
        <div className="mb-6">
          <Card className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Período:</span>
              </div>
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-40" data-testid="select-month">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-32" data-testid="select-year">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Receita Total</div>
            </div>
            <div className="text-2xl font-semibold text-foreground mt-2" data-testid="text-monthly-total">
              {isLoadingReport ? "..." : formatCurrency(monthlyReport?.total || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Média: {isLoadingReport ? "..." : formatCurrency(monthlyReport?.averagePerDay || 0)}/dia
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-red-600" />
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Custos Totais</div>
            </div>
            <div className="text-2xl font-semibold text-foreground mt-2" data-testid="text-monthly-costs">
              {isLoadingDoctor ? "..." : formatCurrency(
                doctorReport?.reduce((sum, doctor) => sum + doctor.totalCosts, 0) || 0
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Fixos + Procedimentos
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Lucro Líquido</div>
            </div>
            <div className={`text-2xl font-semibold mt-2 ${
              (!isLoadingReport && !isLoadingDoctor) && 
              ((monthlyReport?.total || 0) - (doctorReport?.reduce((sum, doctor) => sum + doctor.totalCosts, 0) || 0)) >= 0 
                ? 'text-blue-600' : 'text-red-600'
            }`} data-testid="text-monthly-profit">
              {(isLoadingReport || isLoadingDoctor) ? "..." : formatCurrency(
                (monthlyReport?.total || 0) - (doctorReport?.reduce((sum, doctor) => sum + doctor.totalCosts, 0) || 0)
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Receita - Custos
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Atendimentos</div>
            </div>
            <div className="text-2xl font-semibold text-foreground mt-2" data-testid="text-monthly-count">
              {isLoadingReport ? "..." : monthlyReport?.count || 0}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              <div className="text-xs text-muted-foreground uppercase tracking-wide">PIX + Cartões</div>
            </div>
            <div className="text-2xl font-semibold text-foreground mt-2" data-testid="text-monthly-cards-pix">
              {isLoadingReport ? "..." : formatCurrency(
                (monthlyReport?.pixTotal || 0) + 
                (monthlyReport?.creditCardTotal || 0) + 
                (monthlyReport?.debitCardTotal || 0)
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Pagamentos eletrônicos
            </div>
          </Card>
        </div>

        {/* Charts and Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Doctors Performance */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Análise Financeira por Médico
            </h3>
            {isLoadingDoctor ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : (
              <div className="space-y-6">
                {doctorReport?.map((doctor, index) => (
                  <div key={index} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-lg" data-testid={`doctor-name-${index}`}>
                        {doctorLabels[doctor.doctor] || doctor.doctor}
                      </span>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600" data-testid={`doctor-revenue-${index}`}>
                          Receita: {formatCurrency(doctor.total)}
                        </div>
                        <div className={`text-lg font-semibold ${doctor.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`} data-testid={`doctor-profit-${index}`}>
                          Lucro: {formatCurrency(doctor.profit)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Atendimentos:</div>
                        <div className="font-medium">{doctor.count}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Procedimentos:</div>
                        <div className="font-medium">{doctor.procedures.length} diferentes</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Custos Procedimentos:</div>
                        <div className="font-medium text-orange-600" data-testid={`doctor-procedure-costs-${index}`}>
                          {formatCurrency(doctor.procedureCosts)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Custos Fixos:</div>
                        <div className="font-medium text-red-600" data-testid={`doctor-fixed-costs-${index}`}>
                          {formatCurrency(doctor.fixedCosts)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Custo Total Mensal:</span>
                        <span className="font-semibold text-red-600" data-testid={`doctor-total-costs-${index}`}>
                          {formatCurrency(doctor.totalCosts)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Condomínio (R$ 6.000) + Centro Cirúrgico (R$ 1.500) + Custos de Procedimentos
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Payment Methods */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Métodos de Pagamento
            </h3>
            {isLoadingPayment ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : (
              <div className="space-y-4">
                {paymentReport?.map((payment, index) => (
                  <div key={index} className="border-b border-border pb-3 last:border-b-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium" data-testid={`payment-method-${index}`}>
                        {paymentMethodLabels[payment.method] || payment.method}
                      </span>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-green-600" data-testid={`payment-total-${index}`}>
                          {formatCurrency(payment.total)}
                        </span>
                        <div className="text-sm text-muted-foreground" data-testid={`payment-percentage-${index}`}>
                          {formatPercentage(payment.percentage)}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {payment.count} transações
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Charts Section - Placeholder for future implementation */}
        <div className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Gráficos de Análise (Em Desenvolvimento)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                Evolução Mensal por Médico
              </div>
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                Distribuição Métodos de Pagamento
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}