import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle, Printer } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { entryByOptions, doctorOptions } from "@/lib/procedure-data";
import { formatCurrency } from "@/lib/export-utils";
import type { FinancialEntry } from "@shared/schema";

interface CloseCashButtonProps {
  selectedDate: string;
}

export function CloseCashButton({ selectedDate }: CloseCashButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [closedBy, setClosedBy] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Check if cash is already closed for this date
  const { data: existingClosure, isLoading: isCheckingClosure } = useQuery<any>({
    queryKey: ["/api/daily-closure", selectedDate],
    enabled: !!selectedDate,
  });

  // Get daily summary for confirmation
  const { data: summary } = useQuery<any>({
    queryKey: ["/api/daily-summary", selectedDate],
    enabled: !!selectedDate,
  });

  // Get financial entries for printing
  const { data: entries } = useQuery<FinancialEntry[]>({
    queryKey: ["/api/financial-entries", selectedDate],
    queryFn: () => fetch(`/api/financial-entries?date=${selectedDate}`).then(res => res.json()),
    enabled: !!selectedDate,
  });

  const closeCashMutation = useMutation({
    mutationFn: async (data: { date: string; closedBy: string }) => {
      const response = await apiRequest("POST", "/api/daily-closure", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Caixa fechado com sucesso!",
        description: "Os dados do dia foram salvos permanentemente.",
      });
      setIsOpen(false);
      setClosedBy("");
      queryClient.invalidateQueries({ queryKey: ["/api/daily-closure"] });
    },
    onError: (error: any) => {
      const errorMessage = error.message === "Entry already exists"
        ? "Caixa já foi fechado para este dia"
        : "Erro ao fechar caixa";

      toast({
        title: "Erro ao fechar caixa",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCloseCash = () => {
    if (!closedBy) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione quem está fechando o caixa.",
        variant: "destructive",
      });
      return;
    }

    closeCashMutation.mutate({
      date: selectedDate,
      closedBy
    });
  };

  const handlePrint = () => {
    if (!summary) return;

    // Criar elementos para impressão de forma mais segura
    const getDoctorLabel = (doctorValue: string) => {
      const doctor = doctorOptions.find(d => d.value === doctorValue);
      return doctor ? doctor.label : doctorValue;
    };

    const getPaymentMethodsText = (paymentDetails: any[]) => {
      if (!paymentDetails || paymentDetails.length === 0) return 'N/A';

      return paymentDetails.map(payment => {
        const labels: Record<string, string> = {
          pix: 'PIX',
          transferencia: 'Transferência',
          cartao_credito: 'Cartão Crédito',
          cartao_debito: 'Cartão Débito',
          dinheiro: 'Dinheiro'
        };
        const methodLabel = labels[payment.method] || payment.method;
        const installments = payment.installments && payment.installments > 1 ? ` ${payment.installments}x` : '';
        return `${methodLabel}${installments}: ${formatCurrency(payment.value)}`;
      }).join(' + ');
    };

    const printContent = `<!DOCTYPE html>
<html>
<head>
  <title>Relatório do Caixa - ${selectedDate}</title>
  <style>
    @page { size: A4 landscape; margin: 1cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { font-size: 18px; margin-bottom: 5px; }
    .header h2 { font-size: 14px; color: #666; }
    .summary { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border: 1px solid #ddd; }
    .summary-item { text-align: center; }
    .summary-item .label { font-weight: bold; font-size: 10px; color: #666; }
    .summary-item .value { font-size: 12px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 6px 4px; text-align: left; font-size: 10px; }
    th { background-color: #f8f9fa; font-weight: bold; text-align: center; }
    .patient-name { font-weight: bold; }
    .value-cell { text-align: right; font-weight: bold; }
    .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; }
    @media print { body { margin: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Clínica Basile - Relatório do Caixa</h1>
    <h2>Data: ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</h2>
  </div>
  <div class="summary">
    <div class="summary-item">
      <div class="label">TOTAL GERAL</div>
      <div class="value">${formatCurrency(summary.total)}</div>
    </div>
    <div class="summary-item">
      <div class="label">PIX</div>
      <div class="value">${formatCurrency(summary.pixTotal)}</div>
    </div>
    <div class="summary-item">
      <div class="label">TRANSFERÊNCIA</div>
      <div class="value">${formatCurrency(summary.transferTotal)}</div>
    </div>
    <div class="summary-item">
      <div class="label">CARTÃO CRÉDITO</div>
      <div class="value">${formatCurrency(summary.creditCardTotal)}</div>
    </div>
    <div class="summary-item">
      <div class="label">CARTÃO DÉBITO</div>
      <div class="value">${formatCurrency(summary.debitCardTotal)}</div>
    </div>
    <div class="summary-item">
      <div class="label">DINHEIRO</div>
      <div class="value">${formatCurrency(summary.cashTotal)}</div>
    </div>
    <div class="summary-item">
      <div class="label">ENTRADAS</div>
      <div class="value">${summary.count}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 12%">Código</th>
        <th style="width: 18%">Paciente</th>
        <th style="width: 15%">Médico</th>
        <th style="width: 18%">Procedimento</th>
        <th style="width: 10%">Valor</th>
        <th style="width: 20%">Pagamento</th>
        <th style="width: 7%">NF</th>
      </tr>
    </thead>
    <tbody>
      ${entries && entries.length > 0 ? entries.map(entry => `
        <tr>
          <td>${entry.patientCode || '-'}</td>
          <td class="patient-name">${entry.patientName}</td>
          <td>${getDoctorLabel(entry.doctor)}</td>
          <td>${entry.procedure}</td>
          <td class="value-cell">${formatCurrency(parseFloat(entry.procedureValue))}</td>
          <td>${getPaymentMethodsText(entry.paymentDetails || [])}</td>
          <td style="text-align: center">${entry.invoiceNumber || '-'}</td>
        </tr>
      `).join('') : `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px;">Nenhuma entrada encontrada para este dia.</td>
        </tr>
      `}
    </tbody>
  </table>
  <div class="footer">
    <p>Relatório gerado em ${new Date().toLocaleString('pt-BR')} • Clínica Basile - Sistema de Controle Financeiro</p>
  </div>
</body>
</html>`;

    // Usar setTimeout para garantir que o DOM está pronto
    setTimeout(() => {
      try {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
          toast({
            title: "Erro de impressão",
            description: "Não foi possível abrir a janela de impressão. Verifique se o bloqueador de popup está desabilitado.",
            variant: "destructive",
          });
          return;
        }

        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();

        // Aguardar o carregamento antes de imprimir
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };

        // Fallback se onload não funcionar
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 100);

      } catch (error) {
        console.error('Erro na impressão:', error);
        toast({
          title: "Erro de impressão",
          description: "Ocorreu um erro ao tentar imprimir o relatório.",
          variant: "destructive",
        });
      }
    }, 100);
  };

  if (isCheckingClosure) {
    return (
      <Button disabled className="bg-gray-400">
        <Lock className="w-4 h-4 mr-2" />
        Verificando...
      </Button>
    );
  }

  if (existingClosure) {
    return (
      <Button
        disabled
        className="bg-green-600 text-white cursor-not-allowed"
        data-testid="button-cash-closed"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Caixa Fechado
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-red-600 hover:bg-red-700 text-white"
          data-testid="button-close-cash"
        >
          <Lock className="w-4 h-4 mr-2" />
          Fechar Caixa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar Caixa do Dia</DialogTitle>
          <DialogDescription>
            Confirme o fechamento do caixa de {selectedDate}. Esta ação salvará permanentemente os dados do dia para controle futuro.
          </DialogDescription>
        </DialogHeader>

        {summary && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-3">Resumo do Dia</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium ml-2">{formatCurrency(summary.total)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Entradas:</span>
                  <span className="font-medium ml-2">{summary.count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">PIX:</span>
                  <span className="font-medium ml-2">{formatCurrency(summary.pixTotal)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cartão Crédito:</span>
                  <span className="font-medium ml-2">{formatCurrency(summary.creditCardTotal)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cartão Débito:</span>
                  <span className="font-medium ml-2">{formatCurrency(summary.debitCardTotal)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Dinheiro:</span>
                  <span className="font-medium ml-2">{formatCurrency(summary.cashTotal)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Fechado por *</label>
              <Select value={closedBy} onValueChange={setClosedBy}>
                <SelectTrigger data-testid="select-closed-by">
                  <SelectValue placeholder="Selecione quem está fechando o caixa" />
                </SelectTrigger>
                <SelectContent>
                  {entryByOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={!summary}
                className="flex items-center"
                data-testid="button-print"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Relatório
              </Button>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={closeCashMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCloseCash}
                  disabled={closeCashMutation.isPending || !closedBy}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="button-confirm-close"
                >
                  {closeCashMutation.isPending ? "Fechando..." : "Confirmar Fechamento"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}