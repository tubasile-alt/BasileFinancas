import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Users, DollarSign, Calendar, CreditCard } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import PasswordProtection from "@/components/password-protection";
import { MainNavigation } from "@/components/main-navigation";
import { getProcedureCost, MONTHLY_FIXED_COSTS } from "@/lib/procedure-costs";

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
  cardTotal: number;
  nfTotal: number;
}

interface PaymentMethodReportData {
  method: string;
  total: number;
  count: number;
  percentage: number;
}

interface AnnualExpenseData {
  mes: number;
  label: string;
  receita: number;
  gasto: number;
  impostos: number;
  folha: number;
  outros: number;
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

  const { data: annualExpenses, isLoading: isLoadingAnnual } = useQuery<AnnualExpenseData[]>({
    queryKey: ["/api/annual-expenses-summary", selectedYear],
    enabled: !!selectedYear,
  });

  const { data: monthlyTotalsToPay, isLoading: isLoadingMonthlyTotals } = useQuery<any[]>({
    queryKey: ["/api/monthly-totals-to-pay", selectedYear],
    enabled: !!selectedYear,
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
    <PasswordProtection>
      <div className="min-h-screen bg-background">
        <MainNavigation />

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-red-600" />
              <div className="flex-1">
                <div className="text-sm text-muted-foreground uppercase tracking-wide">Total a Pagar</div>
                <div className="space-y-2 mt-3">
                  {isLoadingDoctor ? (
                    <div className="text-muted-foreground">Carregando...</div>
                  ) : (
                    <>
                      {doctorReport?.filter(doctor => doctor.doctor !== 'fisioterapia').map((doctor, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <div className="text-sm font-medium">
                            {doctorLabels[doctor.doctor] || doctor.doctor}
                          </div>
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(doctor.totalCosts + (doctor.doctor === 'icb-transplante' ? 0 : Math.max(doctor.cardTotal, doctor.nfTotal) * 0.11))}
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between items-center font-bold text-base">
                          <div>TOTAL:</div>
                          <div className="text-red-700 text-lg">
                            {formatCurrency(
                              (doctorReport?.filter(doctor => doctor.doctor !== 'fisioterapia').reduce((sum, doctor) => 
                                sum + doctor.totalCosts + (doctor.doctor === 'icb-transplante' ? 0 : Math.max(doctor.cardTotal, doctor.nfTotal) * 0.11), 0
                              ) || 0)
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-red-600" />
              <div className="flex-1">
                <div className="text-sm text-muted-foreground uppercase tracking-wide">Total Pago {selectedYear}</div>
                <div className="space-y-1.5 mt-3 max-h-48 overflow-y-auto">
                  {isLoadingMonthlyTotals ? (
                    <div className="text-muted-foreground">Carregando...</div>
                  ) : (
                    <>
                      {monthlyTotalsToPay?.map((month, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <div className="text-xs font-medium">
                            {month.label}
                          </div>
                          <div className="text-xs font-bold text-red-600">
                            {formatCurrency(month.total_a_pagar)}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Cards por Médico */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
          {isLoadingDoctor ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">Carregando dados dos médicos...</div>
          ) : (
            doctorReport?.filter(doctor => doctor.doctor !== 'fisioterapia').map((doctor, index) => (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Users className="h-6 w-6 text-blue-600" />
                    <h3 className="text-xl font-bold" data-testid={`doctor-name-${index}`}>
                      {doctorLabels[doctor.doctor] || doctor.doctor}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600" data-testid={`doctor-costs-${index}`}>
                      {formatCurrency(doctor.totalCosts + (doctor.doctor === 'icb-transplante' ? 0 : Math.max(doctor.cardTotal, doctor.nfTotal) * 0.11))}
                    </div>
                    <div className="text-sm text-muted-foreground">Total a Pagar</div>
                    <div className="text-sm text-blue-600 mt-1">
                      Cartão: {formatCurrency(doctor.cardTotal)}
                    </div>
                    <div className="text-sm text-purple-600">
                      Com NF: {formatCurrency(doctor.nfTotal)}
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-muted rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Custos Procedimentos</div>
                      <div className="font-semibold text-lg text-red-600">{formatCurrency(doctor.procedureCosts)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Taxa 11%</div>
                      <div className="font-semibold text-lg text-orange-600">
                        {doctor.doctor === 'icb-transplante' ? 
                          formatCurrency(0) : 
                          formatCurrency(Math.max(doctor.cardTotal, doctor.nfTotal) * 0.11)
                        }
                      </div>
                    </div>
                  </div>
                  {['dr-filipe', 'dr-vinicius', 'dr-basile', 'icb-transplante', 'dr-arthur'].includes(doctor.doctor) && (
                    <div className="grid grid-cols-2 gap-4 text-sm border-t pt-3">
                      <div>
                        <div className="text-muted-foreground">Condomínio</div>
                        <div className="font-semibold text-red-600">
                          {doctor.doctor === 'dr-arthur' 
                            ? formatCurrency(12000) 
                            : formatCurrency(MONTHLY_FIXED_COSTS.condominio)}
                        </div>
                        {doctor.doctor === 'dr-arthur' && (
                          <div className="text-xs text-muted-foreground">2 condomínios</div>
                        )}
                      </div>
                      <div>
                        <div className="text-muted-foreground">Centro Cirúrgico</div>
                        <div className="font-semibold text-red-600">{formatCurrency(MONTHLY_FIXED_COSTS.centro_cirurgico)}</div>
                      </div>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="text-center">
                      <div className="text-muted-foreground text-sm">TOTAL A PAGAR</div>
                      <div className="font-bold text-xl text-red-700">
                        {formatCurrency(doctor.totalCosts + (doctor.doctor === 'icb-transplante' ? 0 : Math.max(doctor.cardTotal, doctor.nfTotal) * 0.11))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 text-muted-foreground uppercase text-xs tracking-wide">
                    Procedimentos Realizados
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {doctor.procedures.map((procedure, procIndex) => {
                      // Passar a data do mês selecionado para usar a tabela de preços correta
                      const monthDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                      const procedureCost = getProcedureCost(doctor.doctor, procedure.procedure, monthDate);
                      const totalCostForProcedure = procedureCost * procedure.count;
                      return (
                        <div key={procIndex} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate" title={procedure.procedure}>
                              {procedure.procedure}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {procedure.count} {procedure.count === 1 ? 'vez' : 'vezes'} • Custo: {formatCurrency(procedureCost)} cada
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <div className="text-lg font-bold text-red-600">
                              {formatCurrency(totalCostForProcedure)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Métodos de Pagamento */}
        <Card className="p-6 mb-6">
          <h3 className="text-xl font-semibold mb-6 flex items-center">
            <CreditCard className="h-6 w-6 mr-3" />
            Distribuição por Método de Pagamento
          </h3>
          {isLoadingPayment ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentReport?.map((payment, index) => (
                <div key={index} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-lg" data-testid={`payment-method-${index}`}>
                      {paymentMethodLabels[payment.method] || payment.method}
                    </span>
                    <span className="text-sm text-muted-foreground" data-testid={`payment-percentage-${index}`}>
                      {formatPercentage(payment.percentage)}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-1" data-testid={`payment-total-${index}`}>
                    {formatCurrency(payment.total)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {payment.count} transações
                    {payment.method === 'cartao_credito' && (
                      <span className="block text-xs text-purple-600 mt-1">
                        (Inclui taxa de 11%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
      </div>
    </PasswordProtection>
  );
}