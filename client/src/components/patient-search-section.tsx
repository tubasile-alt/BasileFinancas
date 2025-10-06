import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, User, Edit, Calendar, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FinancialEntryForm } from "@/components/financial-entry-form";
import type { FinancialEntry } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Patient {
  id: string;
  patientName: string;
  patientCode: string;
  entryDate: string;
  procedure: string;
  invoiceNumber: string | null;
}

export function PatientSearchSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [invoiceNumbers, setInvoiceNumbers] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/unique-patients", searchTerm],
    queryFn: async () => {
      const response = await fetch(`/api/unique-patients?search=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    enabled: searchTerm.length >= 2,
  });

  const { data: patientEntries = [] } = useQuery<FinancialEntry[]>({
    queryKey: ["/api/financial-entries", "patient", selectedPatient?.patientName],
    enabled: !!selectedPatient,
    select: (entries) => entries.filter(entry => 
      entry.patientName === selectedPatient?.patientName
    ),
  });

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchTerm(patient.patientName);
  };

  const handleEditEntry = (entry: FinancialEntry) => {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditingEntry(null);
    setIsEditDialogOpen(false);
  };

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ entryId, invoiceNumber }: { entryId: string; invoiceNumber: string }) => {
      await apiRequest("PATCH", `/api/financial-entries/${entryId}`, { invoiceNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-entries"] });
      toast({
        title: "Sucesso!",
        description: "Número da nota fiscal atualizado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a nota fiscal.",
        variant: "destructive",
      });
    },
  });

  const handleInvoiceUpdate = (entryId: string) => {
    const invoiceNumber = invoiceNumbers[entryId];
    if (invoiceNumber && invoiceNumber.trim()) {
      updateInvoiceMutation.mutate({ entryId, invoiceNumber: invoiceNumber.trim() });
    }
  };

  // No need to filter here since backend already filters
  const filteredPatients = patients;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-bold">
          <Search className="mr-3 h-6 w-6 text-primary" />
          Buscar Pacientes Cadastrados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome do paciente..."
              className="pl-10"
              data-testid="input-patient-search"
            />
          </div>

          {/* Patient Suggestions */}
          {searchTerm.length >= 2 && filteredPatients.length > 0 && !selectedPatient && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Pacientes encontrados (últimas entradas):</h4>
              <div className="grid gap-2 max-h-96 overflow-y-auto">
                {filteredPatients.map((patient, index) => (
                  <div
                    key={patient.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handlePatientSelect(patient)}
                    data-testid={`patient-option-${index}`}
                  >
                    <div className="flex items-start space-x-3 flex-1">
                      <User className="h-4 w-4 text-muted-foreground mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{patient.patientName}</div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(patient.entryDate), "dd/MM/yyyy")}</span>
                          </div>
                          <div className="truncate">{patient.procedure}</div>
                          {patient.invoiceNumber && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <FileText className="h-3 w-3" />
                              <span>NF: {patient.invoiceNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="ml-2">
                      Selecionar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {searchTerm.length >= 2 && filteredPatients.length === 0 && (
            <div className="text-center text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
              Nenhum paciente encontrado com esse nome
            </div>
          )}

          {/* Search hint */}
          {searchTerm.length > 0 && searchTerm.length < 2 && (
            <div className="text-xs text-muted-foreground">
              Digite pelo menos 2 caracteres para buscar
            </div>
          )}

          {/* Selected Patient Entries */}
          {selectedPatient && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold">Entradas de {selectedPatient.patientName}</h3>
                  <Badge variant="secondary">{patientEntries.length} entradas</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPatient(null);
                    setSearchTerm("");
                  }}
                  data-testid="button-clear-selection"
                >
                  Nova Busca
                </Button>
              </div>

              {patientEntries.length > 0 ? (
                <div className="space-y-3">
                  {patientEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {new Date(entry.entryDate).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <Badge variant="outline">{entry.doctor}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <strong>Procedimento:</strong> {entry.procedure}
                          </div>
                          <div className="text-sm">
                            <strong>Valor:</strong> R$ {entry.procedureValue ? Number(entry.procedureValue).toFixed(2).replace('.', ',') : '0,00'}
                          </div>
                          
                          {/* Invoice Number Field */}
                          <div className="flex items-center gap-2 pt-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Número da NF"
                              defaultValue={entry.invoiceNumber || ""}
                              onChange={(e) => setInvoiceNumbers(prev => ({ ...prev, [entry.id]: e.target.value }))}
                              className="max-w-xs"
                              data-testid={`input-invoice-${entry.id}`}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleInvoiceUpdate(entry.id)}
                              disabled={updateInvoiceMutation.isPending}
                              data-testid={`button-update-invoice-${entry.id}`}
                            >
                              {updateInvoiceMutation.isPending ? "Salvando..." : "Salvar NF"}
                            </Button>
                          </div>
                        </div>
                        
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditEntry(entry)}
                              data-testid={`button-edit-entry-${entry.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Editar Entrada - {selectedPatient.patientName}</DialogTitle>
                            </DialogHeader>
                            {editingEntry && (
                              <FinancialEntryForm 
                                mode="edit" 
                                editData={editingEntry}
                                onSuccess={handleEditClose}
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                  Nenhuma entrada encontrada para este paciente
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}