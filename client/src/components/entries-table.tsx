import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FinancialEntry } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { List, Download, Edit, Trash2, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, formatCurrency, formatTime } from "@/lib/export-utils";
import { doctorOptions } from "@/lib/procedure-data";
import { DailySummary } from "./daily-summary";

interface EntriesTableProps {
  selectedDate: string;
}

export function EntriesTable({ selectedDate }: EntriesTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");

  const queryParams = new URLSearchParams();
  if (selectedDate) queryParams.append('date', selectedDate);
  if (selectedDoctor && selectedDoctor !== "all") queryParams.append('doctor', selectedDoctor);
  const queryString = queryParams.toString();
  const url = `/api/financial-entries${queryString ? `?${queryString}` : ''}`;

  const { data: entries = [], isLoading } = useQuery<FinancialEntry[]>({
    queryKey: [url],
    enabled: !!selectedDate,
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/financial-entries/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Entrada removida",
        description: "A entrada foi removida com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-summary"] });
    },
    onError: () => {
      toast({
        title: "Erro ao remover entrada",
        description: "Ocorreu um erro ao remover a entrada.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteEntry = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta entrada?")) {
      deleteEntryMutation.mutate(id);
    }
  };

  const handleExport = () => {
    const filteredEntries = filterEntries(entries);
    exportToCSV(filteredEntries, `entradas-${selectedDate}`);
    toast({
      title: "Exportação concluída",
      description: "Os dados foram exportados para CSV.",
    });
  };

  const filterEntries = (entries: FinancialEntry[]) => {
    return entries.filter(entry => {
      const matchesSearch = entry.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.patientCode.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  };

  const filteredEntries = filterEntries(entries);

  const getDoctorLabel = (doctorValue: string) => {
    const doctor = doctorOptions.find(d => d.value === doctorValue);
    return doctor ? doctor.label : doctorValue;
  };

  const getPaymentLabel = (method: string, installments?: number) => {
    if (method === 'cartao_credito' && installments && installments > 1) {
      return `Cartão ${installments}x`;
    }
    const labels: Record<string, string> = {
      pix: 'PIX',
      transferencia: 'Transferência',
      cartao_credito: 'Cartão',
      dinheiro: 'Dinheiro'
    };
    return labels[method] || method;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-12">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Entradas do Dia</h2>
        <p className="text-muted-foreground">Registros financeiros de hoje</p>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg font-semibold">
              <List className="mr-2 h-5 w-5 text-primary" />
              Resumo e Listagem
              <Badge variant="secondary" className="ml-2" data-testid="badge-entries-count">
                {filteredEntries.length} entradas
              </Badge>
            </CardTitle>
          
          <div className="flex items-center space-x-3">
            <Input
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
              data-testid="input-search"
            />
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="w-48" data-testid="select-filter-doctor">
                <SelectValue placeholder="Todos os médicos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os médicos</SelectItem>
                {doctorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExport} data-testid="button-export">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="px-6 py-4 bg-muted/30 border-b border-border">
          <DailySummary date={selectedDate} />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted text-muted-foreground">
                <TableHead>Hora</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Médico</TableHead>
                <TableHead>Procedimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-center">NF</TableHead>
                <TableHead>Lançado por</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhuma entrada encontrada para este dia.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm" data-testid={`text-time-${entry.id}`}>
                      {entry.createdAt ? formatTime(entry.createdAt) : ''}
                    </TableCell>
                    <TableCell className="text-sm font-medium" data-testid={`text-patient-${entry.id}`}>
                      {entry.patientName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`text-code-${entry.id}`}>
                      {entry.patientCode}
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-doctor-${entry.id}`}>
                      {getDoctorLabel(entry.doctor)}
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-procedure-${entry.id}`}>
                      {entry.procedure}
                    </TableCell>
                    <TableCell className="text-sm font-semibold" data-testid={`text-value-${entry.id}`}>
                      {formatCurrency(parseFloat(entry.procedureValue))}
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-payment-${entry.id}`}>
                      {getPaymentLabel(entry.paymentMethod, entry.installments || undefined)}
                    </TableCell>
                    <TableCell className="text-center" data-testid={`icon-invoice-${entry.id}`}>
                      {entry.invoiceRequested ? (
                        <Check className="h-4 w-4 text-accent mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`text-entry-by-${entry.id}`}>
                      {entry.entryBy}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary/80"
                          data-testid={`button-edit-${entry.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/80"
                          onClick={() => handleDeleteEntry(entry.id)}
                          data-testid={`button-delete-${entry.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
