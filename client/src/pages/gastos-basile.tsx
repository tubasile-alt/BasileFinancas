/**
 * Página Principal: Balanço Operacional – Clínica Basile
 * 
 * Interface completa para processamento de arquivos bancários:
 * - Upload e processamento de arquivos (CSV, XLSX, PDF, OFX)
 * - Lançamentos manuais de gastos/receitas
 * - Persistência de dados históricos
 * - Relatórios operacionais automáticos
 * - Visualizações em gráficos
 * - Exportação padronizada
 */

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Upload, 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Info,
  BarChart3,
  PieChart,
  Plus,
  Save,
  History,
  Edit,
  Trash2,
  Filter
} from 'lucide-react';
import { MainNavigation } from '@/components/main-navigation';

// Import all the processing modules
import { parseFile, type ParseResult, FileType } from '@/lib/file-parsers';
import { normalizeTransactions, type NormalizationResult } from '@/lib/data-normalizer';
import { 
  generateOperationalSummary, 
  generateCategoryReport, 
  generateWeeklyCashFlow, 
  generateTop10Expenses,
  generateTop10Revenues 
} from '@/lib/report-generators';
import { ExpenseCategoryChart, WeeklyCashFlowChart } from '@/components/gastos-charts';
import {
  exportExtratoPadronizado,
  exportResumoOperacional,
  exportCategorias,
  exportFluxoSemanal,
  exportTop10Despesas,
  exportTop10Receitas,
  exportAllReports,
  exportAllReportsAsZip,
  generateStandardFilename,
  type CompleteExportData
} from '@/lib/export-functions';
import { formatCurrencyBR } from '@/lib/export-functions';
import type { 
  ClassifiedTransaction, 
  OperationalSummary, 
  CategoryTotal, 
  WeeklyCashFlow, 
  TopTransaction,
  BankTransactionPersistent,
  InsertBankTransactionPersistent,
  ManualExpense,
  InsertManualExpense
} from '@shared/schema';
import { getAllCategories } from '@/lib/classification-rules';

// Tipos para estado da aplicação
interface ProcessingState {
  isUploading: boolean;
  isProcessing: boolean;
  uploadProgress: number;
  processingProgress: number;
}

interface ProcessedData {
  transactions: ClassifiedTransaction[];
  summary: OperationalSummary;
  categoryReport: CategoryTotal[];
  weeklyCashFlow: WeeklyCashFlow[];
  topDespesas: TopTransaction[];
  topReceitas: TopTransaction[];
  metadata: {
    fileName: string;
    fileType: string;
    totalTransactions: number;
    validTransactions: number;
    detectedMonth: number;
    detectedYear: number;
  };
}

interface ExportLink {
  type: string;
  filename: string;
  downloadUrl: string;
}

// Schema para lançamento manual (compatível com banco de dados)
const manualEntrySchema = z.object({
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  description: z.string().min(1, "Descrição é obrigatória"),
  valor: z.string().regex(/^\d+(\.\d{2})?$/, "Valor deve ter formato numérico válido (ex: 123.45)"),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  tipo: z.enum(['entrada', 'saida'], { required_error: "Tipo é obrigatório" }),
  entryBy: z.string().min(1, "Responsável pelo lançamento é obrigatório"),
  observations: z.string().optional(),
});

type ManualEntryFormData = z.infer<typeof manualEntrySchema>;

// Schema para filtros históricos
const historicalFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoria: z.string().optional(),
  tipo: z.string().optional(),
});

type HistoricalFiltersData = z.infer<typeof historicalFiltersSchema>;

export default function GastosBasilePage() {
  // Estados principais
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isUploading: false,
    isProcessing: false,
    uploadProgress: 0,
    processingProgress: 0
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [exportLinks, setExportLinks] = useState<ExportLink[]>([]);
  
  // Configuração de período
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [useAutoDetection, setUseAutoDetection] = useState<boolean>(true);

  // Estados para histórico
  const [historicalFilters, setHistoricalFilters] = useState<HistoricalFiltersData>({});

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Forms
  const manualEntryForm = useForm<ManualEntryFormData>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      dateISO: new Date().toISOString().split('T')[0],
      description: '',
      valor: '0.00',
      categoria: '',
      tipo: 'saida',
      entryBy: 'Sistema',
      observations: '',
    }
  });

  const historicalFiltersForm = useForm<HistoricalFiltersData>({
    resolver: zodResolver(historicalFiltersSchema),
    defaultValues: historicalFilters
  });

  // Meses para o seletor
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  // Anos para o seletor (últimos 5 anos + próximos 2)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  // Categorias para seleção
  const categories = getAllCategories();
  
  // QUERIES: Carregar dados históricos
  const { data: bankTransactions = [], isLoading: loadingBankTransactions } = useQuery<BankTransactionPersistent[]>({
    queryKey: ['/api/bank-transactions'],
    enabled: true
  });

  const { data: manualExpenses = [], isLoading: loadingManualExpenses } = useQuery<ManualExpense[]>({
    queryKey: ['/api/manual-expenses'],
    enabled: true
  });

  // MUTATIONS: Operações CRUD
  const saveExtractMutation = useMutation({
    mutationFn: async (transactions: ClassifiedTransaction[]) => {
      // Converter transações classificadas para formato persistente
      const bankTransactionsToSave: InsertBankTransactionPersistent[] = transactions.map(t => ({
        dateISO: t.dateISO,
        historico: t.historico,
        documento: t.documento,
        valor: t.valor.toString(),
        saldo: t.saldo?.toString(),
        categoria: t.categoria,
        ehOperacional: t.ehOperacional ? 1 : 0,
        mes: t.mes,
        ano: t.ano,
        isoWeek: t.isoWeek,
        source: 'bank_import'
      }));

      // Salvar todas as transações
      const savePromises = bankTransactionsToSave.map(transaction => 
        apiRequest('POST', '/api/bank-transactions', transaction)
      );
      
      return await Promise.all(savePromises);
    },
    onSuccess: () => {
      toast({
        title: "Extrato salvo com sucesso!",
        description: `${processedData?.transactions.length || 0} transações salvas no banco de dados`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-transactions'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar extrato",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    }
  });

  const createManualExpenseMutation = useMutation({
    mutationFn: async (data: ManualEntryFormData) => {
      const expenseData: InsertManualExpense = {
        ...data,
        valor: data.valor.toString(),
      };
      
      const response = await apiRequest('POST', '/api/manual-expenses', expenseData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lançamento salvo com sucesso!",
        description: "Nova entrada foi adicionada ao histórico",
      });
      manualEntryForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/manual-expenses'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar lançamento",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    }
  });

  const deleteManualExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/manual-expenses/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Lançamento excluído",
        description: "Entrada foi removida do histórico",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/manual-expenses'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir lançamento",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    }
  });

  /**
   * Processa arquivo bancário (mantém funcionalidade original)
   */
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setErrors([]);
      setWarnings([]);
      setExportLinks([]);
      
      setProcessingState(prev => ({ 
        ...prev, 
        isUploading: true, 
        uploadProgress: 0 
      }));

      // Etapa 1: Parse do arquivo
      setProcessingState(prev => ({ ...prev, uploadProgress: 25 }));
      
      const parseResult: ParseResult = await parseFile(file);
      
      if (parseResult.warnings.length > 0) {
        setWarnings(parseResult.warnings);
      }

      setProcessingState(prev => ({ 
        ...prev, 
        uploadProgress: 50,
        isUploading: false,
        isProcessing: true,
        processingProgress: 0
      }));

      // Etapa 2: Normalização das transações
      setProcessingState(prev => ({ ...prev, processingProgress: 25 }));
      
      const normalizationResult: NormalizationResult = normalizeTransactions(
        parseResult.transactions,
        {
          strictDateValidation: true,
          allowMultipleMonths: true,
          preserveOriginalHistory: true,
          logSkippedRows: true
        }
      );

      if (normalizationResult.warnings.length > 0) {
        setWarnings(prev => [...prev, ...normalizationResult.warnings]);
      }

      // Detecta mês/ano predominante se auto-detecção estiver habilitada
      let finalMonth = selectedMonth;
      let finalYear = selectedYear;
      
      if (useAutoDetection && normalizationResult.metadata.predominantMonth) {
        const [detectedYear, detectedMonth] = normalizationResult.metadata.predominantMonth.split('-').map(Number);
        finalMonth = detectedMonth;
        finalYear = detectedYear;
        
        toast({
          title: "Período detectado automaticamente",
          description: `${months.find(m => m.value === finalMonth)?.label} de ${finalYear}`,
        });
      }

      setProcessingState(prev => ({ ...prev, processingProgress: 50 }));

      // Etapa 3: Geração de relatórios
      const summary = generateOperationalSummary(normalizationResult.transactions);
      const categoryReport = generateCategoryReport(normalizationResult.transactions);
      const weeklyCashFlow = generateWeeklyCashFlow(normalizationResult.transactions);
      const topDespesas = generateTop10Expenses(normalizationResult.transactions);
      const topReceitas = generateTop10Revenues(normalizationResult.transactions);

      setProcessingState(prev => ({ ...prev, processingProgress: 85 }));

      // Prepara dados processados
      const processed: ProcessedData = {
        transactions: normalizationResult.transactions,
        summary,
        categoryReport,
        weeklyCashFlow,
        topDespesas,
        topReceitas,
        metadata: {
          fileName: file.name,
          fileType: parseResult.metadata.fileType,
          totalTransactions: parseResult.metadata.totalRows,
          validTransactions: normalizationResult.metadata.validTransactions,
          detectedMonth: finalMonth,
          detectedYear: finalYear
        }
      };

      setProcessedData(processed);
      setProcessingState(prev => ({ ...prev, processingProgress: 100 }));

      toast({
        title: "Arquivo processado com sucesso!",
        description: `${processed.metadata.validTransactions} transações válidas processadas`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido durante o processamento';
      setErrors([errorMessage]);
      
      toast({
        title: "Erro no processamento",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setProcessingState({
        isUploading: false,
        isProcessing: false,
        uploadProgress: 0,
        processingProgress: 0
      });
    }
  }, [selectedMonth, selectedYear, useAutoDetection, toast, months]);

  /**
   * Handler para seleção de arquivo
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  /**
   * Handler para drag & drop
   */
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  /**
   * Salvar extrato processado no banco
   */
  const handleSaveExtract = useCallback(() => {
    if (!processedData?.transactions) {
      toast({
        title: "Nenhum extrato para salvar",
        description: "Processe um arquivo primeiro",
        variant: "destructive"
      });
      return;
    }

    saveExtractMutation.mutate(processedData.transactions);
  }, [processedData, saveExtractMutation, toast]);

  /**
   * Submeter lançamento manual
   */
  const handleManualEntrySubmit = useCallback((data: ManualEntryFormData) => {
    createManualExpenseMutation.mutate(data);
  }, [createManualExpenseMutation]);

  /**
   * Excluir lançamento manual
   */
  const handleDeleteManualExpense = useCallback((id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
      deleteManualExpenseMutation.mutate(id);
    }
  }, [deleteManualExpenseMutation]);

  /**
   * Exportação individual de relatórios (mantém funcionalidade original)
   */
  const handleExportReport = useCallback(async (reportType: string) => {
    if (!processedData) return;

    try {
      const { detectedMonth, detectedYear } = processedData.metadata;
      let result;

      switch (reportType) {
        case 'extrato':
          result = await exportExtratoPadronizado(processedData.transactions, { 
            ano: detectedYear, 
            mes: detectedMonth 
          });
          break;
        case 'resumo':
          result = await exportResumoOperacional(processedData.summary, { 
            ano: detectedYear, 
            mes: detectedMonth 
          });
          break;
        case 'categorias':
          result = await exportCategorias(processedData.categoryReport, { 
            ano: detectedYear, 
            mes: detectedMonth 
          });
          break;
        case 'fluxo':
          result = await exportFluxoSemanal(processedData.weeklyCashFlow, { 
            ano: detectedYear, 
            mes: detectedMonth 
          });
          break;
        case 'top_despesas':
          result = await exportTop10Despesas(processedData.topDespesas, { 
            ano: detectedYear, 
            mes: detectedMonth 
          });
          break;
        case 'top_receitas':
          result = await exportTop10Receitas(processedData.topReceitas, { 
            ano: detectedYear, 
            mes: detectedMonth 
          });
          break;
        default:
          throw new Error(`Tipo de relatório não reconhecido: ${reportType}`);
      }

      if (result.success) {
        setExportLinks(prev => [...prev, {
          type: reportType,
          filename: result.filename,
          downloadUrl: `#download-${result.filename}`
        }]);

        toast({
          title: "Relatório exportado!",
          description: `Arquivo: ${result.filename}`,
        });
      } else {
        throw new Error(result.error || 'Erro na exportação');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na exportação';
      toast({
        title: "Erro na exportação",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [processedData, toast]);

  /**
   * Exportação em lote de todos os relatórios (mantém funcionalidade original)
   */
  const handleExportAll = useCallback(async () => {
    if (!processedData) return;

    try {
      const { detectedMonth, detectedYear } = processedData.metadata;
      
      const result = await exportAllReports({
        transactions: processedData.transactions,
        operationalSummary: processedData.summary,
        categoryTotals: processedData.categoryReport,
        weeklyCashFlow: processedData.weeklyCashFlow,
        topExpenses: processedData.topDespesas,
        topRevenues: processedData.topReceitas
      }, { ano: detectedYear, mes: detectedMonth });

      if (result.summary.successful > 0) {
        const successfulFiles = result.results
          .filter(r => r.success)
          .map(r => ({
            type: 'batch',
            filename: r.filename,
            downloadUrl: `#download-${r.filename}`
          }));
        
        setExportLinks(successfulFiles);

        toast({
          title: "Relatórios exportados!",
          description: `${result.summary.successful} de ${result.summary.total} arquivos criados com sucesso`,
        });
        
        if (result.summary.failed > 0) {
          toast({
            title: "Alguns arquivos falharam",
            description: `${result.summary.failed} arquivos não puderam ser exportados`,
            variant: "destructive"
          });
        }
      } else {
        throw new Error('Todos os arquivos falharam na exportação');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na exportação em lote';
      toast({
        title: "Erro na exportação",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [processedData, toast]);

  /**
   * Exportação completa em formato ZIP (mantém funcionalidade original)
   */
  const handleZipExport = useCallback(async () => {
    if (!processedData) return;

    try {
      const { detectedMonth, detectedYear } = processedData.metadata;
      
      const completeData: CompleteExportData = {
        transactions: processedData.transactions,
        operationalSummary: processedData.summary,
        categoryTotals: processedData.categoryReport,
        weeklyCashFlow: processedData.weeklyCashFlow,
        topExpenses: processedData.topDespesas,
        topRevenues: processedData.topReceitas
      };

      // Inclui IDs dos gráficos se disponíveis
      const chartIds = {
        expensesChart: 'expense-category-chart',
        cashFlowChart: 'weekly-cashflow-chart'
      };

      const result = await exportAllReportsAsZip(
        completeData,
        { ano: detectedYear, mes: detectedMonth },
        { chartElementIds: chartIds }
      );

      if (result.success) {
        toast({
          title: "Pacote ZIP exportado com sucesso!",
          description: `Arquivo: ${result.filename} - Estrutura: outputs/${detectedYear}-${detectedMonth.toString().padStart(2, '0')}_ClinicaBasile/`,
        });
      } else {
        throw new Error(result.error || 'Erro na exportação ZIP');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na exportação ZIP';
      toast({
        title: "Erro na exportação ZIP",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [processedData, toast]);

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="page-title">
            Balanço Operacional – Clínica Basile
          </h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Sistema de processamento, lançamentos manuais e análise de extratos bancários
          </p>
        </div>
        
        {/* Tabs Organization */}
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2" data-testid="tab-upload">
              <Upload className="h-4 w-4" />
              Upload & Processamento
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2" data-testid="tab-manual">
              <Plus className="h-4 w-4" />
              Lançamentos Manuais
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Upload & Processamento */}
          <TabsContent value="upload" className="space-y-6">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload de Arquivo Bancário
                </CardTitle>
                <CardDescription>
                  Suporte para CSV, XLSX, PDF e OFX. Máximo 10MB.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Configuração de Período */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/10 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto-detection"
                      checked={useAutoDetection}
                      onChange={(e) => setUseAutoDetection(e.target.checked)}
                      className="rounded"
                      data-testid="checkbox-auto-detection"
                    />
                    <Label htmlFor="auto-detection" className="text-sm">
                      Auto-detectar período
                    </Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="month-select" className="text-sm">Mês</Label>
                    <Select 
                      value={selectedMonth.toString()} 
                      onValueChange={(value) => setSelectedMonth(parseInt(value))}
                      disabled={useAutoDetection}
                    >
                      <SelectTrigger data-testid="select-month">
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map(month => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year-select" className="text-sm">Ano</Label>
                    <Select 
                      value={selectedYear.toString()} 
                      onValueChange={(value) => setSelectedYear(parseInt(value))}
                      disabled={useAutoDetection}
                    >
                      <SelectTrigger data-testid="select-year">
                        <SelectValue placeholder="Selecione o ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Área de Upload */}
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="upload-area"
                >
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    Clique ou arraste um arquivo aqui
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formatos aceitos: CSV, XLSX, PDF, OFX
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls,.pdf,.ofx"
                  onChange={handleFileSelect}
                  data-testid="file-input"
                />

                {/* Progress Bars */}
                {(processingState.isUploading || processingState.isProcessing) && (
                  <div className="space-y-3">
                    {processingState.isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Fazendo upload...</span>
                          <span>{processingState.uploadProgress}%</span>
                        </div>
                        <Progress value={processingState.uploadProgress} data-testid="progress-upload" />
                      </div>
                    )}
                    
                    {processingState.isProcessing && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Processando transações...</span>
                          <span>{processingState.processingProgress}%</span>
                        </div>
                        <Progress value={processingState.processingProgress} data-testid="progress-processing" />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alertas de Erro/Warning */}
            {errors.length > 0 && (
              <Alert variant="destructive" data-testid="alert-errors">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {warnings.length > 0 && (
              <Alert data-testid="alert-warnings">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Dados Processados */}
            {processedData && (
              <div className="space-y-6">
                {/* Resumo do Arquivo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Arquivo Processado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Arquivo:</span>
                        <p className="text-muted-foreground" data-testid="text-filename">
                          {processedData.metadata.fileName}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Tipo:</span>
                        <p className="text-muted-foreground" data-testid="text-filetype">
                          {processedData.metadata.fileType}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Transações:</span>
                        <p className="text-muted-foreground" data-testid="text-transaction-count">
                          {processedData.metadata.validTransactions} / {processedData.metadata.totalTransactions}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Período:</span>
                        <p className="text-muted-foreground" data-testid="text-detected-period">
                          {months.find(m => m.value === processedData.metadata.detectedMonth)?.label} {processedData.metadata.detectedYear}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={handleSaveExtract}
                        disabled={saveExtractMutation.isPending}
                        className="flex items-center gap-2"
                        data-testid="button-save-extract"
                      >
                        {saveExtractMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Salvar Extrato
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Resumo Operacional */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Resumo Operacional
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-600">Receitas</span>
                        </div>
                        <p className="text-2xl font-bold" data-testid="text-total-revenue">
                          {formatCurrencyBR(processedData.summary.entradasReais)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {processedData.summary.numEntradas} entradas
                        </p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <TrendingDown className="h-5 w-5 text-red-600" />
                          <span className="font-medium text-red-600">Despesas</span>
                        </div>
                        <p className="text-2xl font-bold" data-testid="text-total-expenses">
                          {formatCurrencyBR(Math.abs(processedData.summary.saidasReais))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {processedData.summary.numSaidas} saídas
                        </p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-600">Saldo Líquido</span>
                        </div>
                        <p className={`text-2xl font-bold ${processedData.summary.saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-net-balance">
                          {formatCurrencyBR(processedData.summary.saldoLiquido)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {processedData.summary.numEntradas + processedData.summary.numSaidas} transações
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráficos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gastos por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ExpenseCategoryChart 
                        transactions={processedData.transactions}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Fluxo de Caixa Semanal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <WeeklyCashFlowChart 
                        weeklyCashFlow={processedData.weeklyCashFlow}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Top 10 Tabelas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                        Top 10 Despesas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Histórico</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {processedData.topDespesas.map((expense, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">
                                {new Date(expense.data).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="max-w-0 truncate" title={expense.historico}>
                                {expense.historico}
                              </TableCell>
                              <TableCell className="text-right font-medium text-red-600">
                                {formatCurrencyBR(Math.abs(expense.valor))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Top 10 Receitas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Histórico</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {processedData.topReceitas.map((revenue, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">
                                {new Date(revenue.data).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="max-w-0 truncate" title={revenue.historico}>
                                {revenue.historico}
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                {formatCurrencyBR(revenue.valor)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Exportação */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Exportar Relatórios
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleExportReport('extrato')}
                          className="flex items-center gap-2"
                          data-testid="button-export-extrato"
                        >
                          <FileText className="h-4 w-4" />
                          Extrato
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleExportReport('resumo')}
                          className="flex items-center gap-2"
                          data-testid="button-export-resumo"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Resumo
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleExportReport('categorias')}
                          className="flex items-center gap-2"
                          data-testid="button-export-categorias"
                        >
                          <PieChart className="h-4 w-4" />
                          Categorias
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleExportReport('fluxo')}
                          className="flex items-center gap-2"
                          data-testid="button-export-fluxo"
                        >
                          <Calendar className="h-4 w-4" />
                          Fluxo Semanal
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Button
                          onClick={handleExportAll}
                          className="flex items-center gap-2"
                          data-testid="button-export-all"
                        >
                          <Download className="h-4 w-4" />
                          Exportar Todos
                        </Button>
                        <Button
                          onClick={handleZipExport}
                          className="flex items-center gap-2"
                          data-testid="button-export-zip"
                        >
                          <Download className="h-4 w-4" />
                          Pacote ZIP Completo
                        </Button>
                      </div>

                      {exportLinks.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Arquivos Gerados:</h4>
                          <div className="space-y-1">
                            {exportLinks.map((link, index) => (
                              <Badge key={index} variant="secondary" className="mr-2">
                                {link.filename}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Lançamentos Manuais */}
          <TabsContent value="manual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Novo Lançamento Manual
                </CardTitle>
                <CardDescription>
                  Adicione gastos ou receitas que não constam no extrato bancário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...manualEntryForm}>
                  <form onSubmit={manualEntryForm.handleSubmit(handleManualEntrySubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={manualEntryForm.control}
                        name="dateISO"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-manual-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={manualEntryForm.control}
                        name="valor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor (R$)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                min="0.01"
                                placeholder="0,00"
                                {...field} 
                                data-testid="input-manual-valor" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={manualEntryForm.control}
                        name="categoria"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-manual-categoria">
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={manualEntryForm.control}
                        name="tipo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-manual-tipo">
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="entrada">Entrada (Receita)</SelectItem>
                                <SelectItem value="saida">Saída (Despesa)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={manualEntryForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Descrição do lançamento" 
                              {...field} 
                              data-testid="input-manual-description" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={manualEntryForm.control}
                      name="observations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Observações adicionais sobre o lançamento" 
                              className="resize-none"
                              {...field} 
                              data-testid="textarea-manual-observations" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={manualEntryForm.control}
                      name="entryBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável pelo Lançamento</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nome do responsável" 
                              {...field} 
                              data-testid="input-manual-entry-by" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={createManualExpenseMutation.isPending}
                        className="flex items-center gap-2"
                        data-testid="button-save-manual-entry"
                      >
                        {createManualExpenseMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Salvar Lançamento
                          </>
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => manualEntryForm.reset()}
                        data-testid="button-reset-manual-form"
                      >
                        Limpar
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Histórico */}
          <TabsContent value="history" className="space-y-6">
            {/* Seção de Transações Bancárias */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Transações Bancárias Salvas
                </CardTitle>
                <CardDescription>
                  Histórico de extratos bancários processados e salvos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBankTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2">Carregando transações...</span>
                  </div>
                ) : bankTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma transação bancária salva</p>
                    <p className="text-sm">Processe e salve um extrato na aba "Upload & Processamento"</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {bankTransactions.length} transações encontradas
                      </p>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Histórico</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Origem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankTransactions.slice(0, 50).map((transaction: BankTransactionPersistent) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-mono text-sm">
                              {new Date(transaction.dateISO).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="max-w-0 truncate" title={transaction.historico}>
                              {transaction.historico}
                            </TableCell>
                            <TableCell>
                              <Badge variant={transaction.ehOperacional ? "default" : "secondary"}>
                                {transaction.categoria}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${Number(transaction.valor) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrencyBR(Number(transaction.valor))}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {transaction.source === 'bank_import' ? 'Extrato' : transaction.source}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {bankTransactions.length > 50 && (
                      <p className="text-sm text-muted-foreground text-center">
                        Mostrando primeiras 50 transações de {bankTransactions.length}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seção de Lançamentos Manuais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Lançamentos Manuais
                </CardTitle>
                <CardDescription>
                  Gastos e receitas lançados manualmente no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingManualExpenses ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2">Carregando lançamentos...</span>
                  </div>
                ) : manualExpenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Plus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum lançamento manual encontrado</p>
                    <p className="text-sm">Crie um novo lançamento na aba "Lançamentos Manuais"</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {manualExpenses.length} lançamentos encontrados
                      </p>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manualExpenses.map((expense: ManualExpense) => (
                          <TableRow key={expense.id}>
                            <TableCell className="font-mono text-sm">
                              {new Date(expense.dateISO).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="max-w-0 truncate" title={expense.description}>
                              {expense.description}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {expense.categoria}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={expense.tipo === 'entrada' ? 'default' : 'destructive'}>
                                {expense.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${expense.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrencyBR(Number(expense.valor))}
                            </TableCell>
                            <TableCell>
                              {expense.entryBy}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteManualExpense(expense.id)}
                                disabled={deleteManualExpenseMutation.isPending}
                                data-testid={`button-delete-manual-expense-${expense.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}