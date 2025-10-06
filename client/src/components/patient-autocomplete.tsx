import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Search, User, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Patient {
  id: string;
  patientName: string;
  patientCode: string;
  entryDate: string;
  procedure: string;
  invoiceNumber: string | null;
}

interface PatientAutocompleteProps {
  onPatientSelect: (patient: Patient) => void;
  selectedPatient?: Patient | null;
  className?: string;
}

export function PatientAutocomplete({ onPatientSelect, selectedPatient, className }: PatientAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/unique-patients", searchTerm],
    enabled: searchTerm.length >= 2,
  });

  useEffect(() => {
    if (selectedPatient) {
      setInputValue(selectedPatient.patientName);
      setSearchTerm("");
      setIsOpen(false);
    }
  }, [selectedPatient]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSearchTerm(value);
    setIsOpen(value.length >= 2);
    
    // Clear selection if user starts typing something different
    if (selectedPatient && value !== selectedPatient.patientName) {
      onPatientSelect({ 
        id: "",
        patientName: "", 
        patientCode: "",
        entryDate: "",
        procedure: "",
        invoiceNumber: null
      });
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setInputValue(patient.patientName);
    setSearchTerm("");
    setIsOpen(false);
    onPatientSelect(patient);
  };

  const handleClearSelection = () => {
    setInputValue("");
    setSearchTerm("");
    setIsOpen(false);
    onPatientSelect({ 
      id: "",
      patientName: "", 
      patientCode: "",
      entryDate: "",
      procedure: "",
      invoiceNumber: null
    });
  };

  const filteredPatients = patients.filter(patient =>
    patient.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Label className="text-sm font-medium text-foreground">
        Nome do Paciente
      </Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (searchTerm.length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder="Digite o nome do paciente..."
          className="pl-10 pr-10"
          data-testid="input-patient-search"
        />
        {selectedPatient?.patientName && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            onClick={handleClearSelection}
            data-testid="button-clear-patient"
          >
            ×
          </Button>
        )}
      </div>

      {isOpen && filteredPatients.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-96 overflow-auto shadow-lg border border-border bg-background">
          <div className="p-2">
            {filteredPatients.map((patient, index) => (
              <div
                key={patient.id}
                className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted cursor-pointer transition-colors border-b last:border-b-0"
                onClick={() => handlePatientSelect(patient)}
                data-testid={`option-patient-${index}`}
              >
                <User className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {patient.patientName}
                  </div>
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
            ))}
          </div>
        </Card>
      )}

      {isOpen && searchTerm.length >= 2 && filteredPatients.length === 0 && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg border border-border bg-background">
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhum paciente encontrado
          </div>
        </Card>
      )}

      {searchTerm.length > 0 && searchTerm.length < 2 && (
        <div className="text-xs text-muted-foreground mt-1">
          Digite pelo menos 2 caracteres para buscar
        </div>
      )}
    </div>
  );
}