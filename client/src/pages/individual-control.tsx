import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock, CreditCard, DollarSign, TrendingDown, FileText } from "lucide-react";
import { MainNavigation } from "@/components/main-navigation";

interface FinancialEntry {
  id: string;
  patientName: string;
  procedure: string;
  procedureValue: number;
  paymentDetails: {
    method: string;
    card?: number;
    nf?: number;
  };
  invoiceNumber?: string;
  entryDate: string;
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

export default function IndividualControl() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("dr-filipe");
  
  const [showCardModal, setShowCardModal] = useState(false);
  const [showNfModal, setShowNfModal] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "54321") {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const { data: doctorReport } = useQuery<DoctorReportData[]>({
    queryKey: ["/api/monthly-report-by-doctor", selectedYear, selectedMonth],
    enabled: isAuthenticated && !!selectedYear && !!selectedMonth,
  });

  const { data: entries } = useQuery<FinancialEntry[]>({
    queryKey: ["/api/financial-entries", selectedYear, selectedMonth, selectedDoctor],
    enabled: isAuthenticated && !!selectedDoctor && !!selectedYear && !!selectedMonth,
  });

  const selectedDoctorData = doctorReport?.find(d => d.doctor === selectedDoctor);

  const cardEntries = entries?.filter(e => 
    e.paymentDetails?.method === 'card' || e.paymentDetails?.card
  ) || [];

  const nfEntries = entries?.filter(e => 
    e.paymentDetails?.nf && e.paymentDetails.nf > 0
  ) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
    { value: 12, label: 'Dezembro' }
  ];

  const doctors = [
    { value: 'dr-filipe', label: 'Dr. Filipe' },
    { value: 'dr-vinicius', label: 'Dr. Vinícius' },
    { value: 'dr-basile', label: 'Dr. Basile' },
    { value: 'dr-arthur', label: 'Dr. Arthur' },
    { value: 'icb-transplante', label: 'ICB Transplante' },
    { value: 'fisioterapia', label: 'Fisioterapia' }
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Controle Individual</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Digite a senha para acessar
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  placeholder="Digite a senha"
                  className={passwordError ? "border-destructive" : ""}
                  data-testid="input-password"
                />
                {passwordError && (
                  <p className="text-sm text-destructive mt-1">Senha incorreta</p>
                )}
              </div>
              <Button type="submit" className="w-full" data-testid="button-login">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Controle Individual</h1>
            <p className="text-muted-foreground">
              Acompanhe o desempenho financeiro por médico
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsAuthenticated(false)}
            data-testid="button-logout"
          >
            Sair
          </Button>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="doctor">Médico</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger id="doctor" data-testid="select-doctor">
                  <SelectValue placeholder="Selecione o médico" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.value} value={doctor.value}>
                      {doctor.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="month">Mês</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger id="month" data-testid="select-month">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year">Ano</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger id="year" data-testid="select-year">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDoctorData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Faturamento Total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-revenue">
                {formatCurrency(selectedDoctorData.total)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedDoctorData.count} procedimentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Gastos Totais
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-costs">
                {formatCurrency(selectedDoctorData.totalCosts)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Procedimentos + Fixo
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setShowCardModal(true)}
            data-testid="card-card-payments"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pagamentos Cartão
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-card-total">
                {formatCurrency(selectedDoctorData.cardTotal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {cardEntries.length} lançamentos • Clique para ver
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setShowNfModal(true)}
            data-testid="card-nf-payments"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Notas Fiscais
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600" data-testid="text-nf-total">
                {formatCurrency(selectedDoctorData.nfTotal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {nfEntries.length} lançamentos • Clique para ver
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showCardModal} onOpenChange={setShowCardModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançamentos de Cartão</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {cardEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum lançamento de cartão encontrado
              </p>
            ) : (
              <div className="space-y-2">
                {cardEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 space-y-2"
                    data-testid={`entry-card-${entry.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{entry.patientName}</p>
                        <p className="text-sm text-muted-foreground">{entry.procedure}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {formatCurrency(entry.paymentDetails?.card || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.entryDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {entry.invoiceNumber && (
                      <p className="text-xs text-muted-foreground">
                        NF: {entry.invoiceNumber}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNfModal} onOpenChange={setShowNfModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notas Fiscais</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {nfEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma nota fiscal encontrada
              </p>
            ) : (
              <div className="space-y-2">
                {nfEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 space-y-2"
                    data-testid={`entry-nf-${entry.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{entry.patientName}</p>
                        <p className="text-sm text-muted-foreground">{entry.procedure}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">
                          {formatCurrency(entry.paymentDetails?.nf || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.entryDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {entry.invoiceNumber && (
                      <p className="text-xs font-medium">
                        NF: {entry.invoiceNumber}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
