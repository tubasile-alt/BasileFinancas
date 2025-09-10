/**
 * Página Principal: Balanço Operacional – Clínica Basile
 * 
 * Interface completa para processamento de arquivos bancários:
 * - Upload e processamento de arquivos (CSV, XLSX, PDF, OFX)
 * - Relatórios operacionais automáticos
 * - Visualizações em gráficos
 * - Exportação padronizada
 */

import { useState, useRef, useCallback } from 'react';
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
import { useToast } from '@/hooks/use-toast';
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
  PieChart
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
  TopTransaction 
} from '@shared/schema';

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

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  /**
   * Processa arquivo bancário
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
   * Exportação individual de relatórios
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
   * Exportação em lote de todos os relatórios
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
   * Exportação completa em formato ZIP com estrutura de pastas
   * Esta é a função principal que resolve o problema crítico de criação de pastas
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
            Sistema de processamento e análise de extratos bancários
          </p>
        </div>
        
        <div className="space-y-6">

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
                    {processedData.metadata.fileType.toUpperCase()}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Transações:</span>
                  <p className="text-muted-foreground" data-testid="text-transactions">
                    {processedData.metadata.validTransactions} válidas de {processedData.metadata.totalTransactions}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Período:</span>
                  <p className="text-muted-foreground" data-testid="text-period">
                    {months.find(m => m.value === processedData.metadata.detectedMonth)?.label} {processedData.metadata.detectedYear}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumo Operacional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Resumo Operacional
              </CardTitle>
              <CardDescription>
                Análise financeira considerando apenas transações operacionais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Entradas</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-entradas">
                      {formatCurrencyBR(processedData.summary.entradasReais)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {processedData.summary.numEntradas} transações
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Saídas</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600" data-testid="text-saidas">
                      {formatCurrencyBR(processedData.summary.saidasReais)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {processedData.summary.numSaidas} transações
                    </p>
                  </CardContent>
                </Card>

                <Card className={`${processedData.summary.saldoLiquido >= 0 
                  ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' 
                  : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className={`h-5 w-5 ${processedData.summary.saldoLiquido >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                      <span className="font-medium">Saldo Líquido</span>
                    </div>
                    <p className={`text-2xl font-bold ${processedData.summary.saldoLiquido >= 0 ? 'text-blue-600' : 'text-orange-600'}`} data-testid="text-saldo">
                      {formatCurrencyBR(processedData.summary.saldoLiquido)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Entradas - Saídas
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Relatórios Detalhados em Tabs */}
          <Tabs defaultValue="categorias" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="categorias" data-testid="tab-categorias">Por Categoria</TabsTrigger>
              <TabsTrigger value="semanal" data-testid="tab-semanal">Fluxo Semanal</TabsTrigger>
              <TabsTrigger value="top" data-testid="tab-top">Top 5</TabsTrigger>
              <TabsTrigger value="graficos" data-testid="tab-graficos">Gráficos</TabsTrigger>
            </TabsList>

            {/* Tab: Relatório por Categoria */}
            <TabsContent value="categorias" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Relatório por Categoria</CardTitle>
                    <CardDescription>
                      Totais por categoria operacional (ordenado por valor)
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleExportReport('categorias')}
                    variant="outline"
                    size="sm"
                    data-testid="button-export-categorias"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.categoryReport.map((category, index) => (
                        <TableRow key={index} data-testid={`row-category-${index}`}>
                          <TableCell className="font-medium">
                            {category.categoria}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${category.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrencyBR(category.valor)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={category.valor >= 0 ? 'default' : 'destructive'}>
                              {category.valor >= 0 ? 'Receita' : 'Despesa'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Fluxo de Caixa Semanal */}
            <TabsContent value="semanal" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Fluxo de Caixa Semanal</CardTitle>
                    <CardDescription>
                      Totais operacionais agrupados por semana ISO
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleExportReport('fluxo')}
                    variant="outline"
                    size="sm"
                    data-testid="button-export-fluxo"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Semana ISO</TableHead>
                        <TableHead className="text-right">Total Operacional</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.weeklyCashFlow.map((week, index) => (
                        <TableRow key={index} data-testid={`row-week-${index}`}>
                          <TableCell className="font-medium">
                            Semana {week.semana}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${week.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrencyBR(week.valor)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={week.valor >= 0 ? 'default' : 'destructive'}>
                              {week.valor >= 0 ? 'Positivo' : 'Negativo'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Top 5 Despesas e Receitas */}
            <TabsContent value="top" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 5 Despesas */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-red-600">Top 5 Despesas</CardTitle>
                      <CardDescription>
                        Maiores despesas operacionais
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleExportReport('top_despesas')}
                      variant="outline"
                      size="sm"
                      data-testid="button-export-top-despesas"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
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
                        {processedData.topDespesas.map((transaction, index) => (
                          <TableRow key={index} data-testid={`row-top-despesa-${index}`}>
                            <TableCell className="font-mono text-sm">
                              {new Date(transaction.data).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {transaction.historico}
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-600">
                              {formatCurrencyBR(transaction.valor)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Top 5 Receitas */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-green-600">Top 5 Receitas</CardTitle>
                      <CardDescription>
                        Maiores receitas operacionais
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleExportReport('top_receitas')}
                      variant="outline"
                      size="sm"
                      data-testid="button-export-top-receitas"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
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
                        {processedData.topReceitas.map((transaction, index) => (
                          <TableRow key={index} data-testid={`row-top-receita-${index}`}>
                            <TableCell className="font-mono text-sm">
                              {new Date(transaction.data).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {transaction.historico}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              {formatCurrencyBR(transaction.valor)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Gráficos */}
            <TabsContent value="graficos" className="space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Gráfico de Categorias */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Distribuição de Despesas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ExpenseCategoryChart transactions={processedData.transactions} />
                  </CardContent>
                </Card>

                {/* Gráfico de Fluxo Semanal */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Fluxo de Caixa Semanal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WeeklyCashFlowChart weeklyCashFlow={processedData.weeklyCashFlow} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Seção de Exportação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Exportação de Relatórios
              </CardTitle>
              <CardDescription>
                Exporte relatórios individuais ou todos de uma vez
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Exportação Individual */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Button
                  onClick={() => handleExportReport('extrato')}
                  variant="outline"
                  size="sm"
                  data-testid="button-export-extrato"
                >
                  Extrato CSV
                </Button>
                <Button
                  onClick={() => handleExportReport('resumo')}
                  variant="outline"
                  size="sm"
                  data-testid="button-export-resumo"
                >
                  Resumo TXT
                </Button>
                <Button
                  onClick={() => handleExportReport('categorias')}
                  variant="outline"
                  size="sm"
                  data-testid="button-export-categorias-solo"
                >
                  Categorias XLSX
                </Button>
                <Button
                  onClick={() => handleExportReport('fluxo')}
                  variant="outline"
                  size="sm"
                  data-testid="button-export-fluxo-solo"
                >
                  Fluxo XLSX
                </Button>
                <Button
                  onClick={() => handleExportReport('top_despesas')}
                  variant="outline"
                  size="sm"
                  data-testid="button-export-despesas-solo"
                >
                  Top Despesas
                </Button>
                <Button
                  onClick={() => handleExportReport('top_receitas')}
                  variant="outline"
                  size="sm"
                  data-testid="button-export-receitas-solo"
                >
                  Top Receitas
                </Button>
              </div>

              <Separator />

              {/* Exportação em Lote */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-medium">Exportação Completa</h4>
                  <p className="text-sm text-muted-foreground">
                    Gera todos os relatórios em uma pasta organizada
                  </p>
                </div>
                <Button
                  onClick={handleExportAll}
                  size="lg"
                  data-testid="button-export-all"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Todos
                </Button>
              </div>

              {/* Links de Download */}
              {exportLinks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Arquivos Exportados:</h4>
                  <div className="space-y-1">
                    {exportLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span className="font-mono" data-testid={`link-${link.type}-${index}`}>
                          {link.filename}
                        </span>
                        <Badge variant="outline">Pronto</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observação Final */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Este sistema considera apenas transações operacionais para análises de negócio. 
              Movimentações financeiras entre contas (resgates, aplicações, transferências) são automaticamente excluídas 
              dos relatórios para fornecer uma visão realista da operação da clínica.
            </AlertDescription>
          </Alert>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}