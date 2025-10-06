import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, User, Calendar, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  const [invoiceNumber, setInvoiceNumber] = useState("");
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

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ entryId, invoiceNumber }: { entryId: string; invoiceNumber: string }) => {
      await apiRequest("PATCH", `/api/financial-entries/${entryId}`, { invoiceNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/unique-patients"] });
      toast({
        title: "Sucesso!",
        description: "Número da nota fiscal atualizado.",
      });
      setIsEditDialogOpen(false);
      setSearchTerm("");
      setSelectedPatient(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a nota fiscal.",
        variant: "destructive",
      });
    },
  });

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setInvoiceNumber(patient.invoiceNumber || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveInvoice = () => {
    if (selectedPatient) {
      updateInvoiceMutation.mutate({ 
        entryId: selectedPatient.id, 
        invoiceNumber: invoiceNumber.trim() 
      });
    }
  };

  const filteredPatients = patients;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-bold">
          <Search className="mr-3 h-6 w-6 text-primary" />
          Buscar Pacientes e Editar Nota Fiscal
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
          {searchTerm.length >= 2 && filteredPatients.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Clique no paciente para editar a nota fiscal:
              </h4>
              <div className="grid gap-2 max-h-96 overflow-y-auto">
                {filteredPatients.map((patient, index) => (
                  <div
                    key={patient.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handlePatientClick(patient)}
                    data-testid={`patient-option-${index}`}
                  >
                    <div className="flex items-start space-x-3 flex-1">
                      <User className="h-5 w-5 text-muted-foreground mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base">{patient.patientName}</div>
                        <div className="text-xs text-muted-foreground mt-1.5 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(patient.entryDate), "dd/MM/yyyy")}</span>
                          </div>
                          <div className="truncate">{patient.procedure}</div>
                          {patient.invoiceNumber && (
                            <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                              <FileText className="h-3 w-3" />
                              <span>NF: {patient.invoiceNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="ml-2">
                      Editar NF
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
        </div>
      </CardContent>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nota Fiscal</DialogTitle>
          </DialogHeader>
          
          {selectedPatient && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Paciente:</strong> {selectedPatient.patientName}
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Data:</strong> {format(new Date(selectedPatient.entryDate), "dd/MM/yyyy")}
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Procedimento:</strong> {selectedPatient.procedure}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice-number">Número da Nota Fiscal</Label>
                <Input
                  id="invoice-number"
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Digite o número da NF"
                  data-testid="input-invoice-number"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedPatient(null);
              }}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveInvoice}
              disabled={updateInvoiceMutation.isPending}
              data-testid="button-save-invoice"
            >
              {updateInvoiceMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
