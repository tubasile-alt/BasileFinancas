import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFinancialEntrySchema } from "@shared/schema";
import type { InsertFinancialEntry } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PlusCircle, Save, Eraser } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { proceduresByDoctor, doctorOptions, paymentMethodOptions, entryByOptions, installmentOptions } from "@/lib/procedure-data";

export function FinancialEntryForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [showInstallments, setShowInstallments] = useState(false);

  const form = useForm<InsertFinancialEntry>({
    resolver: zodResolver(insertFinancialEntrySchema),
    defaultValues: {
      patientName: "",
      patientCode: "",
      doctor: "",
      procedure: "",
      procedureValue: "0",
      paymentMethod: "",
      installments: 1,
      invoiceRequested: false,
      entryBy: "",
      entryDate: new Date().toISOString().split('T')[0],
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: InsertFinancialEntry) => {
      const response = await apiRequest("POST", "/api/financial-entries", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entrada salva com sucesso!",
        description: "A entrada financeira foi registrada.",
      });
      form.reset();
      setSelectedDoctor("");
      setShowInstallments(false);
      queryClient.invalidateQueries({ queryKey: ["/api/financial-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-summary"] });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar entrada",
        description: "Ocorreu um erro ao registrar a entrada financeira.",
        variant: "destructive",
      });
    },
  });

  const handleDoctorChange = (value: string) => {
    setSelectedDoctor(value);
    form.setValue("doctor", value);
    form.setValue("procedure", "");
    form.setValue("procedureValue", "0");
  };

  const handleProcedureChange = (value: string) => {
    form.setValue("procedure", value);
    const procedures = proceduresByDoctor[selectedDoctor] || [];
    const selectedProcedure = procedures.find(p => p.name === value);
    if (selectedProcedure) {
      form.setValue("procedureValue", selectedProcedure.value.toString());
    }
  };

  const handlePaymentMethodChange = (value: string) => {
    form.setValue("paymentMethod", value);
    const isCredit = value === "cartao_credito";
    setShowInstallments(isCredit);
    if (!isCredit) {
      form.setValue("installments", 1);
    }
  };

  const onSubmit = (data: InsertFinancialEntry) => {
    createEntryMutation.mutate(data);
  };

  const handleClearForm = () => {
    form.reset();
    setSelectedDoctor("");
    setShowInstallments(false);
  };

  const procedureOptions = selectedDoctor ? proceduresByDoctor[selectedDoctor] || [] : [];
  const procedureValue = form.watch("procedureValue");

  return (
    <Card className="mb-8 min-h-[600px]">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center text-xl font-bold">
          <PlusCircle className="mr-3 h-6 w-6 text-primary" />
          Nova Entrada Financeira
        </CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium mb-3 block">Nome da Paciente *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite o nome completo"
                        data-testid="input-patient-name"
                        className="h-12 text-base"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="patientCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium mb-3 block">Código da Paciente *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: PAC001"
                        data-testid="input-patient-code"
                        className="h-12 text-base"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium mb-3 block">Data *</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        data-testid="input-entry-date"
                        className="h-12 text-base"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="doctor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium mb-3 block">Médico *</FormLabel>
                    <Select onValueChange={handleDoctorChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-doctor" className="h-12 text-base">
                          <SelectValue placeholder="Selecione o médico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {doctorOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="procedure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium mb-3 block">Procedimento *</FormLabel>
                    <Select onValueChange={handleProcedureChange} value={field.value} disabled={!selectedDoctor}>
                      <FormControl>
                        <SelectTrigger data-testid="select-procedure" className="h-12 text-base">
                          <SelectValue placeholder={selectedDoctor ? "Selecione o procedimento" : "Primeiro selecione o médico"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {procedureOptions.map((procedure) => (
                          <SelectItem key={procedure.name} value={procedure.name}>
                            {procedure.name} - R$ {procedure.value.toFixed(2).replace('.', ',')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="procedureValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium mb-3 block">Valor do Procedimento</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="R$ 0,00"
                        readOnly
                        value={procedureValue ? `R$ ${parseFloat(procedureValue).toFixed(2).replace('.', ',')}` : "R$ 0,00"}
                        data-testid="input-procedure-value"
                        className="bg-muted h-12 text-base font-semibold"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium mb-3 block">Modo de Pagamento *</FormLabel>
                    <Select onValueChange={handlePaymentMethodChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method" className="h-12 text-base">
                          <SelectValue placeholder="Selecione o modo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showInstallments && (
                <FormField
                  control={form.control}
                  name="installments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium mb-3 block">Quantidade de Parcelas</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-installments" className="h-12 text-base">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {installmentOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="invoiceRequested"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-4 space-y-0 py-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-invoice"
                        className="w-5 h-5"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-base font-medium">Nota fiscal solicitada</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entryBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium mb-3 block">Lançado por *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-entry-by" className="h-12 text-base">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {entryByOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between pt-8">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClearForm}
                data-testid="button-clear"
                className="h-12 px-8 text-base"
              >
                <Eraser className="mr-2 h-5 w-5" />
                Limpar Formulário
              </Button>
              <Button 
                type="submit" 
                disabled={createEntryMutation.isPending}
                data-testid="button-submit"
                className="h-12 px-8 text-base bg-primary hover:bg-primary/90"
              >
                <Save className="mr-2 h-5 w-5" />
                {createEntryMutation.isPending ? "Salvando..." : "Salvar Entrada"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
