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
import type { PaymentDetail } from "@shared/schema";
import { proceduresByDoctor, doctorOptions, paymentMethodOptions, entryByOptions, installmentOptions } from "@/lib/procedure-data";

export function FinancialEntryForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([{ method: '', value: 0, installments: 1 }]);

  const form = useForm<InsertFinancialEntry>({
    resolver: zodResolver(insertFinancialEntrySchema),
    defaultValues: {
      patientName: "",
      patientCode: "",
      doctor: "",
      procedure: "",
      procedureValue: "0",
      paymentDetails: [{ method: '', value: 0, installments: 1 }],
      invoiceNumber: "",
      observations: "",
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
      setPaymentDetails([{ method: '', value: 0, installments: 1 }]);
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

  const updatePaymentDetail = (index: number, field: keyof PaymentDetail, value: any) => {
    const updated = [...paymentDetails];
    updated[index] = { ...updated[index], [field]: value };
    setPaymentDetails(updated);
    form.setValue('paymentDetails', updated);
  };

  const addPaymentMethod = () => {
    const updated = [...paymentDetails, { method: '', value: 0, installments: 1 }];
    setPaymentDetails(updated);
    form.setValue('paymentDetails', updated);
  };

  const removePaymentMethod = (index: number) => {
    if (paymentDetails.length > 1) {
      const updated = paymentDetails.filter((_, i) => i !== index);
      setPaymentDetails(updated);
      form.setValue('paymentDetails', updated);
    }
  };

  const onSubmit = (data: InsertFinancialEntry) => {
    const submitData = {
      ...data,
      paymentDetails: paymentDetails
    };
    createEntryMutation.mutate(submitData);
  };

  const handleClearForm = () => {
    form.reset();
    setSelectedDoctor("");
    setPaymentDetails([{ method: '', value: 0, installments: 1 }]);
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
                            {procedure.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />


              {/* Seção de Múltiplos Pagamentos */}
              <div className="col-span-full">
                <FormLabel className="text-base font-medium mb-3 block">Métodos de Pagamento *</FormLabel>
                <div className="space-y-4">
                  {paymentDetails.map((payment, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                      <div>
                        <FormLabel className="text-sm font-medium mb-2 block">Método</FormLabel>
                        <Select 
                          value={payment.method} 
                          onValueChange={(value) => updatePaymentDetail(index, 'method', value)}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethodOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <FormLabel className="text-sm font-medium mb-2 block">Valor (R$)</FormLabel>
                        <Input
                          type="number"
                          step="0.01"
                          value={payment.value || ''}
                          onChange={(e) => updatePaymentDetail(index, 'value', parseFloat(e.target.value) || 0)}
                          className="h-10 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="Digite o valor"
                        />
                      </div>
                      
                      {payment.method === 'cartao_credito' && (
                        <div>
                          <FormLabel className="text-sm font-medium mb-2 block">Parcelas</FormLabel>
                          <Select 
                            value={payment.installments?.toString()} 
                            onValueChange={(value) => updatePaymentDetail(index, 'installments', parseInt(value))}
                          >
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="1x" />
                            </SelectTrigger>
                            <SelectContent>
                              {installmentOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      <div className="flex items-end space-x-2">
                        {paymentDetails.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removePaymentMethod(index)}
                            className="h-10"
                          >
                            Remover
                          </Button>
                        )}
                        {index === paymentDetails.length - 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addPaymentMethod}
                            className="h-10"
                          >
                            + Adicionar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium mb-3 block">Número da Nota Fiscal</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Deixe vazio se não foi solicitado"
                        data-testid="input-invoice-number"
                        className="h-12 text-base"
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium mb-3 block">Observações</FormLabel>
                    <FormControl>
                      <textarea 
                        placeholder="Adicione observações sobre este lançamento..."
                        data-testid="textarea-observations"
                        className="w-full h-20 p-3 text-base border rounded-md resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
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
