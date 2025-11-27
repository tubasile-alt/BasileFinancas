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

import { useState, useRef, useCallback, useEffect } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  generateTop10Revenues,
  generateEnhancedOperationalSummary,
  generateEnhancedCategoryReport,
  generateEnhancedTop10Expenses,
  generateEnhancedTop10Revenues,
  generateEnhancedWeeklyCashFlow,
  annotateTransactions,
  getEnhancedReportStats 
} from '@/lib/report-generators';
import { ExpenseCategoryChart, WeeklyCashFlowChart } from '@/components/gastos-charts';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  InsertManualExpense,
  EnhancedOperationalSummary,
  AnnotatedTransaction,
  CategorizedTotal,
  CategorizedTransactionList,
  ReviewQueueItem,
  UXMessages
} from '@shared/schema';
import { 
  getAllCategories, 
  classifyTransactionAdvanced,
  type AdvancedClassificationResult,
  type ClassificationDictionaries
} from '@/lib/classification-rules';

// Tipos para estado da aplicação
interface ProcessingState {
  isUploading: boolean;
  isProcessing: boolean;
  uploadProgress: number;
  processingProgress: number;
}

interface ProcessedData {
  transactions: ClassifiedTransaction[];
  annotatedTransactions: AnnotatedTransaction[];
  summary: OperationalSummary;
  enhancedSummary: EnhancedOperationalSummary;
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
  uxMessages: UXMessages;
  enhancedStats: {
    totalTransactions: number;
    operationalTransactions: number;
    nonOperationalTransactions: number;
    financialMovements: number;
    taxes: number;
    confirmedSalaries: number;
    heuristicSalaries: number;
    reviewQueue: number;
    operationalRate: number;
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

// Esquema para validação do formulário de salvamento de relatório
const saveReportSchema = z.object({
  nomeRelatorio: z.string().min(1, "Nome do relatório é obrigatório"),
  observacoes: z.string().optional(),
});

type ManualEntryFormData = z.infer<typeof manualEntrySchema>;
type SaveReportFormData = z.infer<typeof saveReportSchema>;

// Schema para filtros históricos
const historicalFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoria: z.string().optional(),
  tipo: z.string().optional(),
});

type HistoricalFiltersData = z.infer<typeof historicalFiltersSchema>;

// Schema para filtros de gasto anual
const annualFiltersSchema = z.object({
  year: z.number().min(2020).max(new Date().getFullYear()),
  categoria: z.string().optional(),
  tipo: z.enum(['entrada', 'saida', 'todos']).optional(),
});

type AnnualFiltersData = z.infer<typeof annualFiltersSchema>;

// Interface para dados anuais com despesas por categoria
interface AnnualExpenseData {
  mes: number;
  label: string;
  receita: number;
  gasto: number;
  impostos: number;
  folha: number;
  outros: number;
}

// Interface para ações de revisão
interface ReviewAction {
  type: 'receita' | 'salario' | 'fornecedor' | 'revisado';
  item: ReviewQueueItem;
  index: number;
}

interface ReviewState {
  isProcessing: boolean;
  processingIndex: number | null;
  showConfirmDialog: boolean;
  pendingAction: ReviewAction | null;
  selectedCategory: string;
}

// Schema para confirmação de reclassificação
const reviewActionSchema = z.object({
  categoria: z.string().min(1, "Categoria é obrigatória"),
  observations: z.string().optional(),
});

type ReviewActionFormData = z.infer<typeof reviewActionSchema>;

// Import backend schema
import type { AnnualSpendResponse } from '@shared/schema';

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

  // Estados para gasto anual
  const [annualFilters, setAnnualFilters] = useState<AnnualFiltersData>({
    year: new Date().getFullYear(),
    categoria: undefined,
    tipo: 'todos'
  });

  // Estados para dicionários (classificação avançada)
  const [funcionarios, setFuncionarios] = useState<string[]>([]);
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [dictionariesText, setDictionariesText] = useState({
    funcionarios: '',
    fornecedores: ''
  });
  
  // Estados para salvamento de relatórios
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Estados para ações de revisão
  const [reviewState, setReviewState] = useState<ReviewState>({
    isProcessing: false,
    processingIndex: null,
    showConfirmDialog: false,
    pendingAction: null,
    selectedCategory: ''
  });

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

  const annualFiltersForm = useForm<AnnualFiltersData>({
    resolver: zodResolver(annualFiltersSchema),
    defaultValues: annualFilters
  });

  const reviewActionForm = useForm<ReviewActionFormData>({
    resolver: zodResolver(reviewActionSchema),
    defaultValues: {
      categoria: '',
      observations: '',
    }
  });

  // Form para salvamento de relatório
  const saveReportForm = useForm<SaveReportFormData>({
    resolver: zodResolver(saveReportSchema),
    defaultValues: {
      nomeRelatorio: '',
      observacoes: '',
    }
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

  // Funções helper para gestão de dicionários
  const updateFuncionarios = useCallback((text: string) => {
    const lista = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    setFuncionarios(lista);
    setDictionariesText(prev => ({ ...prev, funcionarios: text }));
  }, []);

  const updateFornecedores = useCallback((text: string) => {
    const lista = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    setFornecedores(lista);
    setDictionariesText(prev => ({ ...prev, fornecedores: text }));
  }, []);
  
  // QUERIES: Carregar dados históricos
  const { data: bankTransactions = [], isLoading: loadingBankTransactions } = useQuery<BankTransactionPersistent[]>({
    queryKey: ['/api/bank-transactions'],
    enabled: true
  });

  const { data: manualExpenses = [], isLoading: loadingManualExpenses } = useQuery<ManualExpense[]>({
    queryKey: ['/api/manual-expenses'],
    enabled: true
  });

  // Carregar funcionários do backend para classificação automática
  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Array<{id: string; name: string}>>({
    queryKey: ['/api/employees'],
    enabled: true
  });

  // Carregar fornecedores do backend para classificação automática
  const { data: suppliersData = [], isLoading: loadingSuppliers } = useQuery<Array<{id: string; name: string; categoria?: string}>>({
    queryKey: ['/api/suppliers'],
    enabled: true
  });

  // Atualizar lista de funcionários quando dados forem carregados
  useEffect(() => {
    if (employees.length > 0 && funcionarios.length === 0) {
      const funcionariosList = employees.map((emp) => emp.name);
      setFuncionarios(funcionariosList);
    }
  }, [employees, funcionarios.length]);

  // Atualizar lista de fornecedores quando dados forem carregados
  useEffect(() => {
    if (suppliersData.length > 0 && fornecedores.length === 0) {
      const fornecedoresList = suppliersData.map((sup) => sup.name);
      setFornecedores(fornecedoresList);
      setDictionariesText(prev => ({ ...prev, fornecedores: fornecedoresList.join('\n') }));
    }
  }, [suppliersData, fornecedores.length]);

  // Helper function to transform backend data to frontend format
  const transformAnnualData = (backendData: AnnualSpendResponse) => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const monthlyData = backendData.months.map(month => ({
      month: month.month,
      monthName: monthNames[month.month - 1],
      entradas: month.entradas,
      saidas: month.saidas,
      saldoLiquido: month.net
    }));

    // Calculate total for percentage calculation
    const totalExpenses = backendData.byCategory.reduce((sum, cat) => sum + cat.saidas, 0);
    const totalRevenues = backendData.byCategory.reduce((sum, cat) => sum + cat.entradas, 0);
    const grandTotal = totalExpenses + totalRevenues;

    // Create category breakdown with tipos (split entrada/saida for each category)
    const categoryBreakdown: Array<{categoria: string; total: number; tipo: 'entrada' | 'saida'; percentage: number}> = [];
    
    backendData.byCategory.forEach(cat => {
      if (cat.entradas > 0) {
        categoryBreakdown.push({
          categoria: cat.categoria,
          total: cat.entradas,
          tipo: 'entrada',
          percentage: grandTotal > 0 ? (cat.entradas / grandTotal) * 100 : 0
        });
      }
      if (cat.saidas > 0) {
        categoryBreakdown.push({
          categoria: cat.categoria,
          total: cat.saidas,
          tipo: 'saida',
          percentage: grandTotal > 0 ? (cat.saidas / grandTotal) * 100 : 0
        });
      }
    });

    // Sort by total descending
    categoryBreakdown.sort((a, b) => b.total - a.total);

    return {
      totals: {
        entradas: backendData.totals.entradas,
        saidas: backendData.totals.saidas,
        saldoLiquido: backendData.totals.net
      },
      monthlyData,
      categoryBreakdown
    };
  };

  const { data: rawAnnualData, isLoading: loadingAnnualSpend } = useQuery<AnnualSpendResponse>({
    queryKey: ['/api/annual-spend', annualFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('year', annualFilters.year.toString());
      if (annualFilters.categoria && annualFilters.categoria !== 'all') {
        params.set('categoria', annualFilters.categoria);
      }
      if (annualFilters.tipo && annualFilters.tipo !== 'todos') {
        params.set('tipo', annualFilters.tipo);
      }
      
      const response = await fetch(`/api/annual-spend?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch annual spend data');
      }
      return response.json();
    },
    enabled: true
  });

  // Transform the data for frontend use
  const annualSpendData = rawAnnualData ? transformAnnualData(rawAnnualData) : null;

  // Query para dados anuais detalhados por categoria
  const { data: annualExpenses = [] } = useQuery<AnnualExpenseData[]>({
    queryKey: ['/api/annual-expenses-summary', annualFilters.year],
    queryFn: async () => {
      const res = await fetch(`/api/annual-expenses-summary?year=${annualFilters.year}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!annualFilters.year,
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

  // Mutation para salvar relatório mensal
  const saveMonthlyReportMutation = useMutation({
    mutationFn: async (data: SaveReportFormData) => {
      if (!processedData) {
        throw new Error("Nenhum dado processado para salvar");
      }

      const { detectedMonth, detectedYear } = processedData.metadata;
      const monthName = months.find(m => m.value === detectedMonth)?.label || 'Mês';

      const reportData = {
        mes: detectedMonth,
        ano: detectedYear,
        nomeRelatorio: data.nomeRelatorio || `${monthName} ${detectedYear}`,
        dataProcessamento: new Date().toISOString(),
        transactionsData: processedData.transactions,
        enhancedSummaryData: processedData.enhancedSummary,
        categoryReportData: processedData.categoryReport,
        weeklyCashFlowData: processedData.weeklyCashFlow,
        topDespesasData: processedData.topDespesas,
        topReceitasData: processedData.topReceitas,
        totalTransactions: processedData.transactions.length,
        totalAmount: processedData.enhancedSummary.saldoLiquido.toString(),
      };

      const response = await apiRequest('POST', '/api/saved-monthly-reports', reportData);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Relatório salvo com sucesso!",
        description: `Relatório "${data.nomeRelatorio}" foi salvo permanentemente`,
      });
      saveReportForm.reset();
      setSaveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/saved-monthly-reports'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar relatório",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    }
  });

  /**
   * Handlers para ações de revisão
   */
  const handleReviewAction = useCallback((
    action: 'receita' | 'salario' | 'fornecedor' | 'revisado',
    item: ReviewQueueItem,
    index: number
  ) => {
    console.log('🎯 HandleReviewAction chamado:', { action, historico: item.historico, index });
    
    const reviewAction: ReviewAction = { type: action, item, index };
    
    // Para ações que precisam de categoria específica, abrir diálogo
    if (action === 'receita' || action === 'fornecedor' || action === 'salario') {
      let categoria = '';
      if (action === 'receita') categoria = 'Receitas';
      else if (action === 'fornecedor') categoria = 'Fornecedores';
      else if (action === 'salario') categoria = 'Despesa – Folha de Pagamento';
      
      setReviewState(prev => ({
        ...prev,
        showConfirmDialog: true,
        pendingAction: reviewAction,
        selectedCategory: categoria
      }));
      reviewActionForm.setValue('categoria', categoria);
    } else {
      // Para revisado, executar diretamente
      executeReviewAction(reviewAction, item.motivo);
    }
  }, [reviewActionForm]);

  const executeReviewAction = useCallback(async (action: ReviewAction, categoria: string, observations?: string) => {
    console.log('🔧 ExecuteReviewAction chamado:', { action: action.type, categoria, item: action.item.historico });
    
    // Capturar processedData no momento da execução
    const currentProcessedData = processedData;
    console.log('🔍 ProcessedData status:', { 
      hasData: !!currentProcessedData, 
      dataType: typeof currentProcessedData,
      filaLength: currentProcessedData?.enhancedSummary?.filaRevisao?.length
    });
    
    if (!currentProcessedData) {
      console.log('❌ Não há processedData');
      toast({
        title: "Erro",
        description: "Dados não carregados. Tente processar o arquivo novamente.",
        variant: "destructive"
      });
      return;
    }

    setReviewState(prev => ({
      ...prev,
      isProcessing: true,
      processingIndex: action.index
    }));

    try {
      // Mapear tipo de ação para categoria e classificação final
      const actionToClassification = {
        receita: {
          categoria: 'Receita – PIX/Outros Recebimentos',
          classificacaoFinal: 'Receita',
          ehOperacional: 1
        },
        salario: {
          categoria: 'Despesa – Folha de Pagamento',
          classificacaoFinal: 'Salário',
          ehOperacional: 1
        },
        fornecedor: {
          categoria: 'Despesa – Boletos/Fornecedores',
          classificacaoFinal: 'Fornecedor',
          ehOperacional: 1
        },
        revisado: {
          categoria: categoria, // Usa categoria passada como parâmetro
          classificacaoFinal: 'Revisado',
          ehOperacional: 1
        }
      };

      const classification = actionToClassification[action.type];
      // Para tipos específicos, usar categoria do mapeamento interno
      const finalCategoria = (action.type === 'salario' || action.type === 'receita' || action.type === 'fornecedor') 
        ? classification.categoria 
        : categoria;
      
      // Salvar aprendizado via API
      const learnedClassification = {
        historico: action.item.historico,
        categoria: finalCategoria,
        classificacaoFinal: classification.classificacaoFinal,
        ehOperacional: classification.ehOperacional,
        dataAprendizado: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD
        vezesAplicado: 1
      };

      console.log('💾 Salvando aprendizado:', learnedClassification);
      await apiRequest('POST', '/api/learned-classifications', learnedClassification);

      // Atualizar processedData aplicando a nova classificação
      setProcessedData(prev => {
        if (!prev) return prev;
        
        const item = action.item;
        const newFilaRevisao = prev.enhancedSummary.filaRevisao.filter((_, i) => i !== action.index);
        
        // Criar cópia das estruturas existentes
        let newSalariosConfirmados = { ...prev.enhancedSummary.salariosConfirmados };
        let newEnhancedSummary = { ...prev.enhancedSummary };
        
        // Se foi classificado como salário, adicionar à lista de salários confirmados
        if (action.type === 'salario') {
          const novoSalario = {
            data: item.data,
            historico: item.historico,
            valor: item.valor
          };
          
          newSalariosConfirmados = {
            lista: [...newSalariosConfirmados.lista, novoSalario],
            total: newSalariosConfirmados.total + Math.abs(item.valor)
          };
          
          // Atualizar mensagem UX
          newEnhancedSummary = {
            ...newEnhancedSummary,
            salariosConfirmados: newSalariosConfirmados,
            filaRevisao: newFilaRevisao
          };
        } else {
          // Para outras classificações, apenas remover da fila
          newEnhancedSummary = {
            ...newEnhancedSummary,
            filaRevisao: newFilaRevisao
          };
        }
        
        return {
          ...prev,
          enhancedSummary: newEnhancedSummary,
          enhancedStats: {
            ...prev.enhancedStats,
            reviewQueue: newFilaRevisao.length
          },
          // Atualizar mensagem UX para salários confirmados
          uxMessages: {
            ...prev.uxMessages,
            salariosConfirmados: `Salários (confirmados): ${formatCurrencyBR(Math.abs(newEnhancedSummary.salariosConfirmados.total))}`
          }
        };
      });

      // Feedback de sucesso
      const actionLabels = {
        receita: 'Receita',
        salario: 'Salário',
        fornecedor: 'Fornecedor',
        revisado: 'Revisado'
      };

      toast({
        title: `Item classificado como ${actionLabels[action.type]}`,
        description: `Transação foi reclassificada e aprendizado salvo automaticamente`,
      });

    } catch (error) {
      console.error('Erro ao salvar aprendizado:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar aprendizado. A classificação foi aplicada mas não será lembrada.',
        variant: 'destructive'
      });
    } finally {
      // Reset do estado
      setReviewState({
        isProcessing: false,
        processingIndex: null,
        showConfirmDialog: false,
        pendingAction: null,
        selectedCategory: ''
      });
    }
  }, [processedData, toast]);

  const handleConfirmReviewAction = useCallback((data: ReviewActionFormData) => {
    if (!reviewState.pendingAction) return;
    
    executeReviewAction(
      reviewState.pendingAction,
      data.categoria,
      data.observations
    );
  }, [reviewState.pendingAction, executeReviewAction]);

  const handleCancelReviewAction = useCallback(() => {
    setReviewState(prev => ({
      ...prev,
      showConfirmDialog: false,
      pendingAction: null,
      selectedCategory: ''
    }));
    reviewActionForm.reset();
  }, [reviewActionForm]);

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

      // Etapa 3: Carregar aprendizados para aplicação automática
      let learnedClassifications: any[] = [];
      try {
        const response = await apiRequest('GET', '/api/learned-classifications');
        learnedClassifications = await response.json() || [];
        
        if (learnedClassifications.length > 0) {
          toast({
            title: "Aprendizados carregados",
            description: `${learnedClassifications.length} classificações aprendidas serão aplicadas automaticamente`,
          });
        }
      } catch (error) {
        console.warn('Não foi possível carregar aprendizados:', error);
        // Continua processamento sem aprendizados
      }

      setProcessingState(prev => ({ ...prev, processingProgress: 60 }));

      // Etapa 4: Geração de relatórios
      const summary = generateOperationalSummary(normalizationResult.transactions);
      const categoryReport = generateCategoryReport(normalizationResult.transactions);
      const weeklyCashFlow = generateWeeklyCashFlow(normalizationResult.transactions);
      const topDespesas = generateTop10Expenses(normalizationResult.transactions);
      const topReceitas = generateTop10Revenues(normalizationResult.transactions);

      // Etapa 5: Classificação avançada e relatórios aprimorados (COM APRENDIZADO)
      const annotatedTransactions = annotateTransactions(
        normalizationResult.transactions,
        funcionarios,
        fornecedores,
        learnedClassifications
      );

      const enhancedSummary = generateEnhancedOperationalSummary(
        normalizationResult.transactions,
        funcionarios,
        fornecedores,
        learnedClassifications
      );

      const enhancedStats = getEnhancedReportStats(
        normalizationResult.transactions,
        funcionarios,
        fornecedores,
        learnedClassifications
      );

      // Gerar mensagens UX
      const uxMessages: UXMessages = {
        impostos: `Impostos detectados: ${formatCurrencyBR(Math.abs(enhancedSummary.impostos.total))}`,
        salariosConfirmados: `Salários (confirmados): ${formatCurrencyBR(Math.abs(enhancedSummary.salariosConfirmados.total))}`,
        salariosHeuristicos: `Salários (heurístico): ${formatCurrencyBR(Math.abs(enhancedSummary.salariosHeuristicos.total))} — revise e inclua no funcionarios.csv`,
        movimentacoesFinanceiras: `Movimentações financeiras foram excluídas do operacional.`,
        filaRevisao: enhancedSummary.filaRevisao.length > 0 ? `${enhancedSummary.filaRevisao.length} itens precisam revisão manual` : undefined
      };

      setProcessingState(prev => ({ ...prev, processingProgress: 85 }));

      // Prepara dados processados
      const processed: ProcessedData = {
        transactions: normalizationResult.transactions,
        annotatedTransactions,
        summary,
        enhancedSummary,
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
        },
        uxMessages,
        enhancedStats
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
   * Handler para salvar relatório mensal
   */
  const handleSaveReport = useCallback((data: SaveReportFormData) => {
    if (!processedData) {
      toast({
        title: "Nenhum relatório para salvar",
        description: "Processe um arquivo primeiro",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    saveMonthlyReportMutation.mutate(data, {
      onSettled: () => {
        setIsSaving(false);
      }
    });
  }, [processedData, saveMonthlyReportMutation, toast]);

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
   * Handler para atualizar filtros anuais
   */
  const handleAnnualFiltersSubmit = useCallback((data: AnnualFiltersData) => {
    setAnnualFilters(data);
    // Invalida a query para recarregar dados
    queryClient.invalidateQueries({ queryKey: ['/api/annual-spend'] });
  }, []);

  /**
   * Handler para reset dos filtros anuais
   */
  const handleResetAnnualFilters = useCallback(() => {
    const defaultFilters: AnnualFiltersData = {
      year: new Date().getFullYear(),
      categoria: undefined,
      tipo: 'todos'
    };
    setAnnualFilters(defaultFilters);
    annualFiltersForm.reset(defaultFilters);
    queryClient.invalidateQueries({ queryKey: ['/api/annual-spend'] });
  }, [annualFiltersForm]);

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
          result = await exportExtratoPadronizado(
            processedData.transactions, 
            { 
              ano: detectedYear, 
              mes: detectedMonth 
            },
            funcionarios,
            fornecedores
          );
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
        topRevenues: processedData.topReceitas,
        funcionarios,
        fornecedores
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
        topRevenues: processedData.topReceitas,
        funcionarios,
        fornecedores
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload" className="flex items-center gap-2" data-testid="tab-upload">
              <Upload className="h-4 w-4" />
              Upload & Processamento
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2" data-testid="tab-manual">
              <Plus className="h-4 w-4" />
              Lançamentos Manuais
            </TabsTrigger>
            <TabsTrigger value="dicionarios" className="flex items-center gap-2" data-testid="tab-dictionaries">
              <Edit className="h-4 w-4" />
              Dicionários
            </TabsTrigger>
            <TabsTrigger value="gasto-anual" className="flex items-center gap-2" data-testid="tab-gasto-anual">
              <BarChart3 className="h-4 w-4" />
              Gasto Anual
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

                {/* Análise Avançada */}
                {processedData.enhancedSummary && processedData.uxMessages && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Análise Avançada
                      </CardTitle>
                      <CardDescription>
                        Classificação inteligente e mensagens de UX
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Mensagens UX obrigatórias */}
                        <div className="grid gap-3">
                          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                            <Info className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium" data-testid="text-taxes-message">
                              {processedData.uxMessages.impostos}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium" data-testid="text-confirmed-salaries-message">
                              {processedData.uxMessages.salariosConfirmados}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium" data-testid="text-heuristic-salaries-message">
                              {processedData.uxMessages.salariosHeuristicos}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-950/30 rounded-lg">
                            <Info className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium" data-testid="text-financial-movements-message">
                              {processedData.uxMessages.movimentacoesFinanceiras}
                            </span>
                          </div>
                          {processedData.uxMessages.filaRevisao && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium" data-testid="text-review-queue-message">
                                {processedData.uxMessages.filaRevisao}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Totais categorizados em grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                            <div className="flex items-center justify-center gap-1 mb-2">
                              <span className="text-xs font-medium text-blue-600">IMPOSTOS</span>
                            </div>
                            <p className="text-lg font-bold text-blue-600" data-testid="text-taxes-total">
                              {formatCurrencyBR(Math.abs(processedData.enhancedSummary.impostos.total))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {processedData.enhancedSummary.impostos.lista.length} itens
                            </p>
                          </div>

                          <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <div className="flex items-center justify-center gap-1 mb-2">
                              <span className="text-xs font-medium text-green-600">SALÁRIOS (CONF.)</span>
                            </div>
                            <p className="text-lg font-bold text-green-600" data-testid="text-confirmed-salaries-total">
                              {formatCurrencyBR(Math.abs(processedData.enhancedSummary.salariosConfirmados.total))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {processedData.enhancedSummary.salariosConfirmados.lista.length} itens
                            </p>
                          </div>

                          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                            <div className="flex items-center justify-center gap-1 mb-2">
                              <span className="text-xs font-medium text-yellow-600">SALÁRIOS (HEUR.)</span>
                            </div>
                            <p className="text-lg font-bold text-yellow-600" data-testid="text-heuristic-salaries-total">
                              {formatCurrencyBR(Math.abs(processedData.enhancedSummary.salariosHeuristicos.total))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {processedData.enhancedSummary.salariosHeuristicos.lista.length} itens
                            </p>
                          </div>

                          <div className="text-center p-4 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
                            <div className="flex items-center justify-center gap-1 mb-2">
                              <span className="text-xs font-medium text-gray-600">MOV. FINANC.</span>
                            </div>
                            <p className="text-lg font-bold text-gray-600" data-testid="text-financial-movements-total">
                              {formatCurrencyBR(Math.abs(processedData.enhancedSummary.movimentacoesFinanceiras.total))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {processedData.enhancedSummary.movimentacoesFinanceiras.lista.length} itens
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Listas Categorizadas */}
                {processedData.enhancedSummary && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Listas Categorizadas
                      </CardTitle>
                      <CardDescription>
                        Transações agrupadas por classificação avançada
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="impostos" data-testid="tabs-categorized-lists">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="impostos" data-testid="tab-taxes">
                            Impostos ({processedData.enhancedSummary.impostos.lista.length})
                          </TabsTrigger>
                          <TabsTrigger value="salarios" data-testid="tab-salaries">
                            Salários ({processedData.enhancedSummary.salariosConfirmados.lista.length + processedData.enhancedSummary.salariosHeuristicos.lista.length})
                          </TabsTrigger>
                          <TabsTrigger value="movfinanceiras" data-testid="tab-financial-movements">
                            Mov. Financ. ({processedData.enhancedSummary.movimentacoesFinanceiras.lista.length})
                          </TabsTrigger>
                          <TabsTrigger value="revisao" data-testid="tab-review-queue">
                            Fila Revisão ({processedData.enhancedSummary.filaRevisao.length})
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="impostos" className="space-y-4">
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Histórico</TableHead>
                                  <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {processedData.enhancedSummary.impostos.lista.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                                      Nenhum imposto detectado
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  processedData.enhancedSummary.impostos.lista.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium" data-testid={`tax-date-${index}`}>
                                        {item.data}
                                      </TableCell>
                                      <TableCell data-testid={`tax-description-${index}`}>
                                        {item.historico}
                                      </TableCell>
                                      <TableCell className="text-right font-medium text-red-600" data-testid={`tax-value-${index}`}>
                                        {formatCurrencyBR(Math.abs(item.valor))}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          {processedData.enhancedSummary.impostos.lista.length > 0 && (
                            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <span className="text-sm font-medium">Total de Impostos:</span>
                              <span className="text-lg font-bold text-blue-600" data-testid="taxes-category-total">
                                {formatCurrencyBR(Math.abs(processedData.enhancedSummary.impostos.total))}
                              </span>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="salarios" className="space-y-4">
                          <div className="space-y-6">
                            {/* Salários Confirmados */}
                            {processedData.enhancedSummary.salariosConfirmados.lista.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold mb-3 text-green-600">Salários Confirmados</h4>
                                <div className="rounded-md border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Histórico</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {processedData.enhancedSummary.salariosConfirmados.lista.map((item, index) => (
                                        <TableRow key={index}>
                                          <TableCell className="font-medium" data-testid={`confirmed-salary-date-${index}`}>
                                            {item.data}
                                          </TableCell>
                                          <TableCell data-testid={`confirmed-salary-description-${index}`}>
                                            <div className="flex items-center gap-2">
                                              {item.historico}
                                              <Badge variant="secondary" className="text-xs">Confirmado</Badge>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right font-medium text-red-600" data-testid={`confirmed-salary-value-${index}`}>
                                            {formatCurrencyBR(Math.abs(item.valor))}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}

                            {/* Salários Heurísticos */}
                            {processedData.enhancedSummary.salariosHeuristicos.lista.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold mb-3 text-yellow-600">Salários Heurísticos (Requer Revisão)</h4>
                                <div className="rounded-md border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Histórico</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {processedData.enhancedSummary.salariosHeuristicos.lista.map((item, index) => (
                                        <TableRow key={index}>
                                          <TableCell className="font-medium" data-testid={`heuristic-salary-date-${index}`}>
                                            {item.data}
                                          </TableCell>
                                          <TableCell data-testid={`heuristic-salary-description-${index}`}>
                                            <div className="flex items-center gap-2">
                                              {item.historico}
                                              <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">Revisar</Badge>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right font-medium text-red-600" data-testid={`heuristic-salary-value-${index}`}>
                                            {formatCurrencyBR(Math.abs(item.valor))}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}

                            {/* Total de Salários */}
                            {(processedData.enhancedSummary.salariosConfirmados.lista.length > 0 || processedData.enhancedSummary.salariosHeuristicos.lista.length > 0) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {processedData.enhancedSummary.salariosConfirmados.lista.length > 0 && (
                                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                    <span className="text-sm font-medium">Confirmados:</span>
                                    <span className="text-lg font-bold text-green-600" data-testid="confirmed-salaries-category-total">
                                      {formatCurrencyBR(Math.abs(processedData.enhancedSummary.salariosConfirmados.total))}
                                    </span>
                                  </div>
                                )}
                                {processedData.enhancedSummary.salariosHeuristicos.lista.length > 0 && (
                                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                                    <span className="text-sm font-medium">Heurísticos:</span>
                                    <span className="text-lg font-bold text-yellow-600" data-testid="heuristic-salaries-category-total">
                                      {formatCurrencyBR(Math.abs(processedData.enhancedSummary.salariosHeuristicos.total))}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {processedData.enhancedSummary.salariosConfirmados.lista.length === 0 && processedData.enhancedSummary.salariosHeuristicos.lista.length === 0 && (
                              <div className="text-center text-muted-foreground p-6">
                                Nenhum salário detectado
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="movfinanceiras" className="space-y-4">
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Histórico</TableHead>
                                  <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {processedData.enhancedSummary.movimentacoesFinanceiras.lista.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                                      Nenhuma movimentação financeira detectada
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  processedData.enhancedSummary.movimentacoesFinanceiras.lista.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium" data-testid={`financial-movement-date-${index}`}>
                                        {item.data}
                                      </TableCell>
                                      <TableCell data-testid={`financial-movement-description-${index}`}>
                                        <div className="flex items-center gap-2">
                                          {item.historico}
                                          <Badge variant="secondary" className="text-xs">Não Operacional</Badge>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right font-medium text-gray-600" data-testid={`financial-movement-value-${index}`}>
                                        {formatCurrencyBR(item.valor)}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          {processedData.enhancedSummary.movimentacoesFinanceiras.lista.length > 0 && (
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
                              <span className="text-sm font-medium">Total de Movimentações:</span>
                              <span className="text-lg font-bold text-gray-600" data-testid="financial-movements-category-total">
                                {formatCurrencyBR(Math.abs(processedData.enhancedSummary.movimentacoesFinanceiras.total))}
                              </span>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="revisao" className="space-y-4">
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Histórico</TableHead>
                                  <TableHead className="text-right">Valor</TableHead>
                                  <TableHead>Motivo da Revisão</TableHead>
                                  <TableHead className="text-center">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {processedData.enhancedSummary.filaRevisao.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                      Nenhum item na fila de revisão
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  processedData.enhancedSummary.filaRevisao.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium" data-testid={`review-queue-date-${index}`}>
                                        {item.data}
                                      </TableCell>
                                      <TableCell data-testid={`review-queue-description-${index}`}>
                                        {item.historico}
                                      </TableCell>
                                      <TableCell className="text-right font-medium" data-testid={`review-queue-value-${index}`}>
                                        {formatCurrencyBR(item.valor)}
                                      </TableCell>
                                      <TableCell data-testid={`review-queue-reason-${index}`}>
                                        <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                                          {item.motivo}
                                        </Badge>
                                      </TableCell>
                                      <TableCell data-testid={`review-queue-actions-${index}`}>
                                        <div className="flex flex-wrap gap-1 justify-center">
                                          {item.motivo.includes("Possível salário") ? (
                                            // Botões específicos SIM/NÃO para casos de salário heurístico
                                            <>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs px-2 text-green-600 border-green-600 hover:bg-green-50"
                                                onClick={() => handleReviewAction('salario', item, index)}
                                                disabled={reviewState.isProcessing && reviewState.processingIndex === index}
                                                data-testid={`button-salary-yes-${index}`}
                                              >
                                                {reviewState.isProcessing && reviewState.processingIndex === index ? (
                                                  <>
                                                    <span className="animate-spin mr-1">⏳</span>
                                                    Processando...
                                                  </>
                                                ) : (
                                                  <>
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    SIM - É Salário
                                                  </>
                                                )}
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs px-2 text-red-600 border-red-600 hover:bg-red-50"
                                                onClick={() => handleReviewAction('fornecedor', item, index)}
                                                disabled={reviewState.isProcessing && reviewState.processingIndex === index}
                                                data-testid={`button-salary-no-${index}`}
                                              >
                                                {reviewState.isProcessing && reviewState.processingIndex === index ? (
                                                  <>
                                                    <span className="animate-spin mr-1">⏳</span>
                                                    Processando...
                                                  </>
                                                ) : (
                                                  <>
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    NÃO - É Conta/Serviço
                                                  </>
                                                )}
                                              </Button>
                                            </>
                                          ) : (
                                            // Botões padrão para outros casos
                                            <>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs px-2 text-green-600 border-green-600 hover:bg-green-50"
                                                onClick={() => handleReviewAction('receita', item, index)}
                                                disabled={reviewState.isProcessing && reviewState.processingIndex === index}
                                                data-testid={`button-classify-revenue-${index}`}
                                              >
                                                {reviewState.isProcessing && reviewState.processingIndex === index ? (
                                                  <>
                                                    <span className="animate-spin mr-1">⏳</span>
                                                    Processando...
                                                  </>
                                                ) : (
                                                  <>
                                                    <TrendingUp className="h-3 w-3 mr-1" />
                                                    Receita
                                                  </>
                                                )}
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs px-2 text-blue-600 border-blue-600 hover:bg-blue-50"
                                                onClick={() => handleReviewAction('salario', item, index)}
                                                disabled={reviewState.isProcessing && reviewState.processingIndex === index}
                                                data-testid={`button-classify-salary-${index}`}
                                              >
                                                <DollarSign className="h-3 w-3 mr-1" />
                                                Salário
                                              </Button>
                                            </>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs px-2 text-orange-600 border-orange-600 hover:bg-orange-50"
                                            onClick={() => handleReviewAction('fornecedor', item, index)}
                                            disabled={reviewState.isProcessing && reviewState.processingIndex === index}
                                            data-testid={`button-classify-supplier-${index}`}
                                          >
                                            <Edit className="h-3 w-3 mr-1" />
                                            Fornecedor
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs px-2 text-gray-600 border-gray-600 hover:bg-gray-50"
                                            onClick={() => handleReviewAction('revisado', item, index)}
                                            disabled={reviewState.isProcessing && reviewState.processingIndex === index}
                                            data-testid={`button-mark-reviewed-${index}`}
                                          >
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Revisado
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}

                {/* Diálogo de confirmação para ações de revisão */}
                {reviewState.showConfirmDialog && reviewState.pendingAction && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                          <h3 className="text-lg font-semibold">Confirmar Reclassificação</h3>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            <strong>Data:</strong> {reviewState.pendingAction.item.data}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Histórico:</strong> {reviewState.pendingAction.item.historico}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Valor:</strong> {formatCurrencyBR(reviewState.pendingAction.item.valor)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Classificar como:</strong> {reviewState.pendingAction.type === 'receita' ? 'Receita' : 'Fornecedor'}
                          </p>
                        </div>

                        <Form {...reviewActionForm}>
                          <form onSubmit={reviewActionForm.handleSubmit(handleConfirmReviewAction)} className="space-y-4">
                            <FormField
                              control={reviewActionForm.control}
                              name="categoria"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Categoria</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-review-category">
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
                              control={reviewActionForm.control}
                              name="observations"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Observações (opcional)</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Adicione observações sobre esta reclassificação..."
                                      className="resize-none"
                                      {...field}
                                      data-testid="textarea-review-observations"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelReviewAction}
                                data-testid="button-cancel-review"
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="submit"
                                disabled={reviewState.isProcessing}
                                data-testid="button-confirm-review"
                              >
                                {reviewState.isProcessing ? (
                                  <>
                                    <span className="animate-spin mr-2">⏳</span>
                                    Processando...
                                  </>
                                ) : (
                                  'Confirmar'
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </div>
                    </div>
                  </div>
                )}

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
                              <TableCell className="max-w-xs truncate" title={expense.historico} data-testid={`top-expense-description-${index}`}>
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
                              <TableCell className="max-w-xs truncate" title={revenue.historico} data-testid={`top-revenue-description-${index}`}>
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
                        <Button
                          onClick={() => setSaveModalOpen(true)}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                          data-testid="button-save-report"
                        >
                          <Save className="h-4 w-4" />
                          Salvar Relatório
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

          {/* Tab 3: Dicionários */}
          <TabsContent value="dicionarios" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Gestão de Dicionários
                </CardTitle>
                <CardDescription>
                  Configure listas de funcionários e fornecedores para melhor classificação automática
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lista de Funcionários */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Funcionários</CardTitle>
                      <CardDescription>
                        Lista de nomes de funcionários para identificação automática de salários
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="funcionarios-input">Lista de Funcionários (um por linha)</Label>
                          <Textarea
                            id="funcionarios-input"
                            placeholder="João Silva Santos&#10;Maria Oliveira Costa&#10;Pedro Souza Lima"
                            className="min-h-[200px] font-mono text-sm"
                            value={dictionariesText.funcionarios}
                            onChange={(e) => updateFuncionarios(e.target.value)}
                            data-testid="textarea-funcionarios"
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{funcionarios.length} funcionários cadastrados</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateFuncionarios('')}
                            data-testid="button-clear-funcionarios"
                          >
                            Limpar Lista
                          </Button>
                        </div>
                        {funcionarios.length > 0 && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm font-medium">Prévia:</span>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {funcionarios.slice(0, 5).map((nome, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {nome}
                                </Badge>
                              ))}
                              {funcionarios.length > 5 && (
                                <Badge variant="secondary" className="text-xs">+{funcionarios.length - 5} mais</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista de Fornecedores */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Fornecedores</CardTitle>
                      <CardDescription>
                        Lista de fornecedores conhecidos para melhor categorização
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fornecedores-input">Lista de Fornecedores (um por linha)</Label>
                          <Textarea
                            id="fornecedores-input"
                            placeholder="MEDICA LTDA&#10;EQUIPAMENTOS MEDICOS SA&#10;FORNECEDOR HOSPITALAR"
                            className="min-h-[200px] font-mono text-sm"
                            value={dictionariesText.fornecedores}
                            onChange={(e) => updateFornecedores(e.target.value)}
                            data-testid="textarea-fornecedores"
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{fornecedores.length} fornecedores cadastrados</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateFornecedores('')}
                            data-testid="button-clear-fornecedores"
                          >
                            Limpar Lista
                          </Button>
                        </div>
                        {fornecedores.length > 0 && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm font-medium">Prévia:</span>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {fornecedores.slice(0, 5).map((nome, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {nome}
                                </Badge>
                              ))}
                              {fornecedores.length > 5 && (
                                <Badge variant="secondary" className="text-xs">+{fornecedores.length - 5} mais</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Ajuda e Instruções */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Como Usar os Dicionários
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <h4 className="font-semibold">Funcionários:</h4>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Digite um nome completo por linha</li>
                          <li>Use a grafia exata que aparece no extrato</li>
                          <li>PIX para esses nomes serão classificados como salário</li>
                          <li>Exemplo: "JOÃO SILVA SANTOS"</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold">Fornecedores:</h4>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Digite o nome da empresa por linha</li>
                          <li>Inclua variações comuns do nome</li>
                          <li>Transacões serão marcadas como fornecedor conhecido</li>
                          <li>Exemplo: "EMPRESA MEDICA LTDA"</li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-700 dark:text-blue-300">Dica:</p>
                          <p className="text-blue-600 dark:text-blue-400">
                            Os dicionários são aplicados em tempo real ao processar novos arquivos. 
                            Para reaplicar em dados já processados, faça o upload do arquivo novamente.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Gasto Anual */}
          <TabsContent value="gasto-anual" className="space-y-6">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros de Análise
                </CardTitle>
                <CardDescription>
                  Configure os filtros para análise anual de gastos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...annualFiltersForm}>
                  <form onSubmit={annualFiltersForm.handleSubmit(handleAnnualFiltersSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={annualFiltersForm.control}
                        name="year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ano</FormLabel>
                            <Select 
                              value={field.value?.toString()} 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-annual-year">
                                  <SelectValue placeholder="Selecione o ano" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: currentYear - 2020 + 1 }, (_, i) => currentYear - i).map(year => (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={annualFiltersForm.control}
                        name="categoria"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select value={field.value || ""} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-annual-categoria">
                                  <SelectValue placeholder="Todas as categorias" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">Todas as categorias</SelectItem>
                                {categories.map(category => (
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
                        control={annualFiltersForm.control}
                        name="tipo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select value={field.value || "todos"} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-annual-tipo">
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="todos">Todos</SelectItem>
                                <SelectItem value="entrada">Entradas</SelectItem>
                                <SelectItem value="saida">Saídas</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end space-x-2">
                        <Button type="submit" data-testid="button-apply-annual-filters">
                          <Filter className="h-4 w-4 mr-2" />
                          Aplicar
                        </Button>
                        <Button type="button" variant="outline" onClick={handleResetAnnualFilters} data-testid="button-reset-annual-filters">
                          Limpar
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Loading State */}
            {loadingAnnualSpend && (
              <div className="text-center py-8">
                <Progress value={66} className="w-[60%] mx-auto" />
                <p className="text-muted-foreground mt-2">Carregando dados anuais...</p>
              </div>
            )}

            {/* Cards de totais */}
            {annualSpendData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Entradas</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600" data-testid="text-annual-entradas">
                        {formatCurrencyBR(annualSpendData?.totals.entradas || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total de receitas no ano
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Saídas</CardTitle>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600" data-testid="text-annual-saidas">
                        {formatCurrencyBR(annualSpendData?.totals.saidas || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total de despesas no ano
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
                      <DollarSign className={`h-4 w-4 ${(annualSpendData?.totals.saldoLiquido || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${(annualSpendData?.totals.saldoLiquido || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-annual-saldo">
                        {formatCurrencyBR(annualSpendData?.totals.saldoLiquido || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Resultado líquido do ano
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar Chart - Entradas vs Saídas */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Entradas vs Saídas por Mês
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={annualSpendData?.monthlyData || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="monthName" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrencyBR(value)} />
                          <Legend />
                          <Bar dataKey="entradas" fill="#10B981" name="Entradas" />
                          <Bar dataKey="saidas" fill="#EF4444" name="Saídas" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Line Chart - Saldo Líquido */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Saldo Líquido Mensal
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={annualSpendData?.monthlyData || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="monthName" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrencyBR(value)} />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="saldoLiquido" 
                            stroke="#8884d8" 
                            strokeWidth={3}
                            name="Saldo Líquido"
                            dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* 3 Gráficos Adicionais */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico de Impostos por Mês */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Gastos em Impostos por Mês
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={annualExpenses}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrencyBR(value)} />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="impostos" 
                            stroke="#f59e0b" 
                            strokeWidth={2}
                            name="Impostos"
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Gráfico de Folha de Pagamento por Mês */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Folha de Pagamento por Mês
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={annualExpenses}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrencyBR(value)} />
                          <Legend />
                          <Bar dataKey="folha" fill="#8b5cf6" name="Folha de Pagamento" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Outros Gastos por Mês */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Outros Gastos por Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={annualExpenses}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrencyBR(value)} />
                        <Legend />
                        <Bar dataKey="outros" fill="#06b6d4" name="Outros Gastos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Tabela de breakdown por categoria */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Breakdown por Categoria (Top 10)
                    </CardTitle>
                    <CardDescription>
                      Maiores categorias por volume total
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">% do Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {annualSpendData?.categoryBreakdown.slice(0, 10).map((category, index) => (
                          <TableRow key={`${category.categoria}-${category.tipo}`} data-testid={`row-category-${index}`}>
                            <TableCell className="font-medium">{category.categoria}</TableCell>
                            <TableCell>
                              <Badge variant={category.tipo === 'entrada' ? 'default' : 'destructive'}>
                                {category.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrencyBR(category.total)}
                            </TableCell>
                            <TableCell className="text-right">
                              {category.percentage.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        )) || []}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Tab 4: Histórico */}
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
                          <TableHead>Classificação</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Flags</TableHead>
                          <TableHead>Origem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankTransactions.slice(0, 50).map((transaction: BankTransactionPersistent) => {
                          // Aplica classificação avançada para o display
                          const advancedClassification = classifyTransactionAdvanced(
                            transaction.historico,
                            Number(transaction.valor),
                            transaction.dateISO,
                            funcionarios,
                            fornecedores
                          );
                          
                          // Define classe de cor baseada na classificação
                          let badgeColor = 'border-gray-400 text-gray-600';
                          if (advancedClassification.ehMovtoFinanceiro) {
                            badgeColor = 'border-gray-400 text-gray-600';
                          } else if (advancedClassification.ehImposto) {
                            badgeColor = 'border-blue-400 text-blue-600';
                          } else if (advancedClassification.salarioConfirmado) {
                            badgeColor = 'border-green-400 text-green-600';
                          } else if (advancedClassification.ehSalarioHeuristico) {
                            badgeColor = 'border-yellow-400 text-yellow-600';
                          }
                          
                          return (
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
                              <TableCell>
                                <Badge 
                                  variant={advancedClassification.needsReview ? "destructive" : "outline"}
                                  className={`text-xs ${badgeColor}`}
                                  data-testid={`classification-badge-${transaction.id}`}
                                >
                                  {advancedClassification.classificacaoFinal}
                                </Badge>
                              </TableCell>
                              <TableCell className={`text-right font-medium ${Number(transaction.valor) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrencyBR(Number(transaction.valor))}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {advancedClassification.ehMovtoFinanceiro && (
                                    <Badge variant="secondary" className="text-xs">Financ.</Badge>
                                  )}
                                  {advancedClassification.ehImposto && (
                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Imposto</Badge>
                                  )}
                                  {advancedClassification.salarioConfirmado && (
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Salário</Badge>
                                  )}
                                  {advancedClassification.ehSalarioHeuristico && !advancedClassification.salarioConfirmado && (
                                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">PIX?</Badge>
                                  )}
                                  {advancedClassification.needsReview && (
                                    <Badge variant="destructive" className="text-xs">Revisar</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {transaction.source === 'bank_import' ? 'Extrato' : transaction.source}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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