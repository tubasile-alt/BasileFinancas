import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, User, Edit, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FinancialEntryForm } from "@/components/financial-entry-form";
import type { FinancialEntry } from "@shared/schema";

interface Patient {
  patientName: string;
  patientCode: string;
}

export function PatientSearchSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/unique-patients", searchTerm],
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

  const filteredPatients = patients.filter(patient =>
    patient.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <h4 className="text-sm font-medium text-muted-foreground">Pacientes encontrados:</h4>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {filteredPatients.map((patient, index) => (
                  <div
                    key={`${patient.patientName}-${patient.patientCode}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handlePatientSelect(patient)}
                    data-testid={`patient-option-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{patient.patientName}</div>
                        <div className="text-xs text-muted-foreground">Código: {patient.patientCode}</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
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
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
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