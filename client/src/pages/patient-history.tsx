import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Patient, PatientEvolution } from "@shared/schema";

export default function PatientHistory() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [evolutionDate, setEvolutionDate] = useState(new Date().toISOString().split('T')[0]);
  const [evolutionText, setEvolutionText] = useState("");

  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", id],
  });

  const { data: evolutions = [], isLoading: evolutionsLoading } = useQuery<PatientEvolution[]>({
    queryKey: ["/api/patients", id, "evolutions"],
  });

  const createEvolutionMutation = useMutation({
    mutationFn: async (data: { evolutionDate: string; description: string }) =>
      apiRequest("POST", `/api/patients/${id}/evolutions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", id, "evolutions"] });
      setEvolutionDate(new Date().toISOString().split('T')[0]);
      setEvolutionText("");
      setShowForm(false);
      toast({ title: "Evolução criada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar evolução", variant: "destructive" });
    },
  });

  const deleteEvolutionMutation = useMutation({
    mutationFn: async (evolutionId: string) =>
      apiRequest("DELETE", `/api/evolutions/${evolutionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", id, "evolutions"] });
      toast({ title: "Evolução deletada" });
    },
    onError: () => {
      toast({ title: "Erro ao deletar evolução", variant: "destructive" });
    },
  });

  const handleCreateEvolution = async () => {
    if (!evolutionText.trim()) {
      toast({ title: "Digite a descrição da evolução", variant: "destructive" });
      return;
    }
    createEvolutionMutation.mutate({
      evolutionDate,
      description: evolutionText,
    });
  };

  if (patientLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Paciente não encontrado</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/controle-individual")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
            data-testid="button-back"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <h1 className="text-4xl font-bold text-gray-900" data-testid="text-patient-name">
            {patient.name}
          </h1>
          <p className="text-gray-600 mt-2">
            Código: <span className="font-medium" data-testid="text-patient-code">{patient.code}</span>
          </p>
          <p className="text-gray-600">
            Primeira consulta: <span className="font-medium" data-testid="text-first-consultation">
              {formatDate(patient.firstConsultationDate)}
            </span>
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-6 mb-8">
          {/* Initial Consultation Card */}
          <div className="relative">
            <div className="absolute left-6 top-14 bottom-0 w-1 bg-blue-200"></div>
            <Card className="relative z-10 p-6 bg-white shadow-sm border-l-4 border-l-blue-500">
              <div className="flex items-start gap-4">
                <div className="w-4 h-4 rounded-full bg-blue-500 mt-1 flex-shrink-0"></div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900" data-testid="text-consultation-title">
                    Consulta Inicial
                  </h3>
                  <p className="text-sm text-gray-600 mt-1" data-testid="text-consultation-date">
                    {formatDate(patient.firstConsultationDate)}
                  </p>
                  {patient.notes && (
                    <p className="text-gray-700 mt-3 whitespace-pre-wrap" data-testid="text-consultation-notes">
                      {patient.notes}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Evolution Cards */}
          {evolutionsLoading ? (
            <div className="text-center py-8 text-gray-600">
              Carregando evoluções...
            </div>
          ) : evolutions.length > 0 ? (
            evolutions.map((evolution, index) => (
              <div key={evolution.id} className="relative">
                {index < evolutions.length - 1 && (
                  <div className="absolute left-6 top-14 bottom-0 w-1 bg-green-200"></div>
                )}
                <Card className="relative z-10 p-6 bg-white shadow-sm border-l-4 border-l-green-500">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0"></div>
                        <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-evolution-title-${evolution.id}`}>
                          Evolução
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1" data-testid={`text-evolution-date-${evolution.id}`}>
                        {formatDate(evolution.evolutionDate)}
                      </p>
                      <p className="text-gray-700 mt-3 whitespace-pre-wrap" data-testid={`text-evolution-description-${evolution.id}`}>
                        {evolution.description}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm("Tem certeza que deseja deletar esta evolução?")) {
                          deleteEvolutionMutation.mutate(evolution.id);
                        }
                      }}
                      disabled={deleteEvolutionMutation.isPending}
                      className="text-red-500 hover:text-red-700 p-2 flex-shrink-0"
                      data-testid={`button-delete-evolution-${evolution.id}`}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </Card>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-600">
              Nenhuma evolução registrada ainda
            </div>
          )}
        </div>

        {/* Add Evolution Button and Form */}
        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2"
            data-testid="button-add-evolution"
          >
            <Plus size={20} />
            Adicionar Evolução
          </Button>
        ) : (
          <Card className="p-6 bg-white shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Nova Evolução
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data da Evolução
                </label>
                <Input
                  type="date"
                  value={evolutionDate}
                  onChange={(e) => setEvolutionDate(e.target.value)}
                  className="w-full"
                  data-testid="input-evolution-date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <Textarea
                  value={evolutionText}
                  onChange={(e) => setEvolutionText(e.target.value)}
                  placeholder="Descreva a evolução do paciente..."
                  className="w-full min-h-32"
                  data-testid="textarea-evolution-description"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateEvolution}
                  disabled={createEvolutionMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  data-testid="button-save-evolution"
                >
                  {createEvolutionMutation.isPending ? "Salvando..." : "Salvar Evolução"}
                </Button>
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setEvolutionText("");
                    setEvolutionDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900"
                  data-testid="button-cancel-evolution"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
