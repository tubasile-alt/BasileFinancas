import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { entryByOptions } from "@/lib/procedure-data";
import { formatCurrency } from "@/lib/export-utils";

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

            <div className="flex justify-end space-x-2 pt-4">
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
        )}
      </DialogContent>
    </Dialog>
  );
}