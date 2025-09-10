/**
 * Sistema de Exportação de Arquivos - Clínica Basile
 * 
 * Implementa funções de exportação em múltiplos formatos com nomenclatura padronizada:
 * - CSV: dados estruturados com formato pt-BR
 * - XLSX: planilhas Excel usando biblioteca xlsx
 * - PNG: gráficos capturados como imagem
 * - TXT: resumos operacionais formatados
 * 
 * Estrutura de arquivos: outputs/AAAA-MM_ClinicaBasile/
 */

import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
  ClassifiedTransaction,
  OperationalSummary,
  CategoryTotal,
  WeeklyCashFlow,
  TopTransaction
} from '@shared/schema';

// Tipos para configuração de exportação
interface ExportConfig {
  ano: number;
  mes: number;
  createFolder?: boolean;
}

interface CSVOptions {
  separator?: string;
  encoding?: string;
  includeHeaders?: boolean;
}

interface ExportResult {
  success: boolean;
  filename: string;
  error?: string;
}

// ========================================================================================
// UTILITÁRIOS DE NOMENCLATURA E FORMATAÇÃO
// ========================================================================================

/**
 * Gera nome padronizado para arquivos de acordo com especificação
 */
export function generateStandardFilename(
  type: 'extrato_padronizado' | 'resumo_operacional' | 'categorias' | 'fluxo_semanal' | 
        'top10_despesas' | 'top10_receitas' | 'grafico_despesas_categoria' | 'grafico_fluxo_semanal',
  ano: number,
  mes: number,
  extension: 'csv' | 'txt' | 'xlsx' | 'png'
): string {
  const mesFormatado = mes.toString().padStart(2, '0');
  return `${type}_${ano}-${mesFormatado}.${extension}`;
}

/**
 * Gera nome da pasta com estrutura padronizada
 */
export function generateFolderName(ano: number, mes: number): string {
  const mesFormatado = mes.toString().padStart(2, '0');
  return `outputs/${ano}-${mesFormatado}_ClinicaBasile`;
}

/**
 * Formata valor monetário para padrão brasileiro
 */
export function formatCurrencyBR(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Formata número para padrão brasileiro (vírgula decimal, ponto milhares)
 */
export function formatNumberBR(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Formata data para padrão brasileiro
 */
export function formatDateBR(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Converte dados para formato CSV com separador brasileiro
 */
export function convertToCSV(data: any[], options: CSVOptions = {}): string {
  const { separator = ';', includeHeaders = true } = options;

  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Adiciona cabeçalhos se solicitado
  if (includeHeaders) {
    csvRows.push(headers.join(separator));
  }

  // Processa cada linha de dados
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];

      // Trata valores nulos/undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Converte para string e escapa aspas
      const stringValue = String(value);

      // Se contém separador, quebra de linha ou aspas, coloca entre aspas
      if (stringValue.includes(separator) || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    });

    csvRows.push(values.join(separator));
  }

  return csvRows.join('\n');
}

// ========================================================================================
// FUNÇÕES DE EXPORTAÇÃO CSV
// ========================================================================================

/**
 * Exporta extrato padronizado de transações classificadas com dados avançados
 */
export async function exportExtratoPadronizado(
  transactions: ClassifiedTransaction[],
  config: ExportConfig,
  funcionarios: string[] = [],
  fornecedores: string[] = []
): Promise<ExportResult> {
  try {
    // Importa funções de classificação avançada
    const { classifyTransactionAdvanced } = await import('./classification-rules');
    
    const filename = generateStandardFilename('extrato_padronizado', config.ano, config.mes, 'csv');

    // Prepara dados para CSV com formatação brasileira e classificação avançada
    const csvData = transactions.map(transaction => {
      // Aplica classificação avançada para cada transação
      const advancedClassification = classifyTransactionAdvanced(
        transaction.historico,
        transaction.valor,
        transaction.dateISO,
        funcionarios,
        fornecedores
      );
      
      return {
        'Data': formatDateBR(transaction.dateISO),
        'Histórico': transaction.historico,
        'Documento': transaction.documento || '',
        'Valor': formatNumberBR(transaction.valor),
        'Saldo': transaction.saldo ? formatNumberBR(transaction.saldo) : '',
        'Categoria': transaction.categoria,
        'Operacional': transaction.ehOperacional ? 'Sim' : 'Não',
        'Classificacao_Final': advancedClassification.classificacaoFinal,
        'Eh_MovtoFinanceiro': advancedClassification.ehMovtoFinanceiro ? 'Sim' : 'Não',
        'Eh_Imposto': advancedClassification.ehImposto ? 'Sim' : 'Não',
        'Eh_SalarioConfirmado': advancedClassification.salarioConfirmado ? 'Sim' : 'Não',
        'Eh_SalarioHeuristico': advancedClassification.ehSalarioHeuristico ? 'Sim' : 'Não',
        'Precisa_Revisao': advancedClassification.needsReview ? 'Sim' : 'Não',
        'Motivo_Revisao': advancedClassification.reviewReason || '',
        'Score_Confianca': formatNumberBR(advancedClassification.confidenceScore * 100, 1) + '%',
        'Mês': transaction.mes,
        'Ano': transaction.ano,
        'Semana ISO': transaction.isoWeek
      };
    });

    const csvContent = convertToCSV(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);

    return { success: true, filename };
  } catch (error) {
    return { 
      success: false, 
      filename: '', 
      error: error instanceof Error ? error.message : 'Erro desconhecido na exportação CSV' 
    };
  }
}

/**
 * Exporta relatório de categorias
 */
export async function exportCategorias(
  categoryTotals: CategoryTotal[],
  config: ExportConfig
): Promise<ExportResult> {
  try {
    const filename = generateStandardFilename('categorias', config.ano, config.mes, 'csv');

    const csvData = categoryTotals.map((category, index) => ({
      'Ranking': index + 1,
      'Categoria': category.categoria,
      'Valor Total': formatNumberBR(category.valor),
      'Valor Formatado': formatCurrencyBR(category.valor),
      'Tipo': category.valor >= 0 ? 'Receita' : 'Despesa'
    }));

    const csvContent = convertToCSV(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);

    return { success: true, filename };
  } catch (error) {
    return { 
      success: false, 
      filename: '', 
      error: error instanceof Error ? error.message : 'Erro na exportação de categorias' 
    };
  }
}

/**
 * Exporta fluxo de caixa semanal
 */
export async function exportFluxoSemanal(
  weeklyCashFlow: WeeklyCashFlow[],
  config: ExportConfig
): Promise<ExportResult> {
  try {
    const filename = generateStandardFilename('fluxo_semanal', config.ano, config.mes, 'csv');

    const csvData = weeklyCashFlow.map(week => ({
      'Semana ISO': week.semana,
      'Valor Total': formatNumberBR(week.valor),
      'Valor Formatado': formatCurrencyBR(week.valor),
      'Tipo Fluxo': week.valor >= 0 ? 'Entrada Líquida' : 'Saída Líquida',
      'Ano': config.ano
    }));

    const csvContent = convertToCSV(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);

    return { success: true, filename };
  } catch (error) {
    return { 
      success: false, 
      filename: '', 
      error: error instanceof Error ? error.message : 'Erro na exportação de fluxo semanal' 
    };
  }
}

/**
 * Exporta top 10 despesas
 */
export async function exportTop10Despesas(
  topExpenses: TopTransaction[],
  config: ExportConfig
): Promise<ExportResult> {
  try {
    const filename = generateStandardFilename('top10_despesas', config.ano, config.mes, 'csv');

    const csvData = topExpenses.map((expense, index) => ({
      'Ranking': index + 1,
      'Data': formatDateBR(expense.data),
      'Histórico': expense.historico,
      'Categoria': expense.categoria,
      'Valor': formatNumberBR(Math.abs(expense.valor)), // Valor positivo para visualização
      'Valor Formatado': formatCurrencyBR(Math.abs(expense.valor)),
      'Valor Original': formatNumberBR(expense.valor) // Mantém valor negativo original
    }));

    const csvContent = convertToCSV(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);

    return { success: true, filename };
  } catch (error) {
    return { 
      success: false, 
      filename: '', 
      error: error instanceof Error ? error.message : 'Erro na exportação de top 10 despesas' 
    };
  }
}

/**
 * Exporta top 10 receitas
 */
export async function exportTop10Receitas(
  topRevenues: TopTransaction[],
  config: ExportConfig
): Promise<ExportResult> {
  try {
    const filename = generateStandardFilename('top10_receitas', config.ano, config.mes, 'csv');

    const csvData = topRevenues.map((revenue, index) => ({
      'Ranking': index + 1,
      'Data': formatDateBR(revenue.data),
      'Histórico': revenue.historico,
      'Categoria': revenue.categoria,
      'Valor': formatNumberBR(revenue.valor),
      'Valor Formatado': formatCurrencyBR(revenue.valor)
    }));

    const csvContent = convertToCSV(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);

    return { success: true, filename };
  } catch (error) {
    return { 
      success: false, 
      filename: '', 
      error: error instanceof Error ? error.message : 'Erro na exportação de top 10 receitas' 
    };
  }
}

// ========================================================================================
// FUNÇÕES DE EXPORTAÇÃO XLSX
// ========================================================================================

/**
 * Exporta dados para Excel usando biblioteca xlsx
 */
export async function exportToXLSX(
  data: any[],
  filename: string,
  sheetName: string = 'Dados'
): Promise<ExportResult> {
  try {
    if (!data || data.length === 0) {
      throw new Error('Nenhum dado fornecido para exportação');
    }

    // Cria worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Cria workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Ajusta largura das colunas automaticamente
    const headers = Object.keys(data[0]);
    const colWidths = headers.map(header => {
      const maxLength = Math.max(
        header.length,
        ...data.map(row => String(row[header] || '').length)
      );
      return { wch: Math.min(Math.max(maxLength, 10), 50) }; // Min 10, Max 50 caracteres
    });

    worksheet['!cols'] = colWidths;

    // Escreve arquivo
    XLSX.writeFile(workbook, filename);

    return { success: true, filename };
  } catch (error) {
    return { 
      success: false, 
      filename: '', 
      error: error instanceof Error ? error.message : 'Erro na exportação XLSX' 
    };
  }
}

// ========================================================================================
// FUNÇÕES DE EXPORTAÇÃO PNG (GRÁFICOS)
// ========================================================================================

/**
 * Captura elemento DOM como imagem PNG
 */
export async function exportChartAsPNG(
  elementId: string,
  filename: string,
  options: {
    width?: number;
    height?: number;
    backgroundColor?: string;
    scale?: number;
  } = {}
): Promise<ExportResult> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Elemento com ID '${elementId}' não encontrado`);
    }

    const {
      width = 1200,
      height = 800,
      backgroundColor = '#ffffff',
      scale = 2
    } = options;

    // Captura elemento como canvas
    const canvas = await html2canvas(element, {
      width,
      height,
      backgroundColor,
      scale,
      useCORS: true,
      allowTaint: false
    });

    // Converte canvas para blob
    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, filename);
      }
    }, 'image/png');

    return { success: true, filename };
  } catch (error) {
    return { 
      success: false, 
      filename: '', 
      error: error instanceof Error ? error.message : 'Erro na captura de gráfico como PNG' 
    };
  }
}

/**
 * Exporta gráfico de categorias como PNG
 */
export async function exportGraficoCategorias(
  elementId: string,
  config: ExportConfig
): Promise<ExportResult> {
  const filename = generateStandardFilename('grafico_despesas_categoria', config.ano, config.mes, 'png');
  return exportChartAsPNG(elementId, filename, {
    width: 1200,
    height: 800,
    backgroundColor: '#ffffff'
  });
}

/**
 * Exporta gráfico de fluxo semanal como PNG
 */
export async function exportGraficoFluxo(
  elementId: string,
  config: ExportConfig
): Promise<ExportResult> {
  const filename = generateStandardFilename('grafico_fluxo_semanal', config.ano, config.mes, 'png');
  return exportChartAsPNG(elementId, filename, {
    width: 1400,
    height: 600,
    backgroundColor: '#ffffff'
  });
}

// ========================================================================================
// FUNÇÕES DE EXPORTAÇÃO TXT (RESUMO OPERACIONAL)
// ========================================================================================

/**
 * Gera resumo operacional formatado em texto
 */
export function generateOperationalSummaryText(
  summary: OperationalSummary,
  ano: number,
  mes: number,
  additionalData?: {
    categoryTotals?: CategoryTotal[];
    topExpenses?: TopTransaction[];
    topRevenues?: TopTransaction[];
    weeklyCashFlow?: WeeklyCashFlow[];
  }
): string {
  const mesNome = format(new Date(ano, mes - 1, 1), 'MMMM', { locale: ptBR });
  const mesCapitalizado = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);

  let text = '';

  // Cabeçalho
  text += '===============================================\n';
  text += '    RESUMO OPERACIONAL - CLÍNICA BASILE\n';
  text += '===============================================\n';
  text += `Período: ${mesCapitalizado} de ${ano}\n`;
  text += `Gerado em: ${format(new Date(), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}\n\n`;

  // Resumo Financeiro Principal
  text += '📊 RESUMO FINANCEIRO\n';
  text += '─────────────────────────────────────────────\n';
  text += `💰 Entradas Reais:      ${formatCurrencyBR(summary.entradasReais).padStart(15)}\n`;
  text += `💸 Saídas Reais:        ${formatCurrencyBR(summary.saidasReais).padStart(15)}\n`;
  text += `📈 Saldo Líquido:       ${formatCurrencyBR(summary.saldoLiquido).padStart(15)}\n`;
  text += '─────────────────────────────────────────────\n';
  text += `📥 Número de Entradas:  ${summary.numEntradas.toString().padStart(15)}\n`;
  text += `📤 Número de Saídas:    ${summary.numSaidas.toString().padStart(15)}\n`;
  text += `📊 Total Operações:     ${(summary.numEntradas + summary.numSaidas).toString().padStart(15)}\n\n`;

  // Análise de Performance
  const ticketMedioEntrada = summary.numEntradas > 0 ? summary.entradasReais / summary.numEntradas : 0;
  const ticketMedioSaida = summary.numSaidas > 0 ? summary.saidasReais / summary.numSaidas : 0;
  const margemOperacional = summary.entradasReais > 0 ? (summary.saldoLiquido / summary.entradasReais) * 100 : 0;

  text += '📈 ANÁLISE DE PERFORMANCE\n';
  text += '─────────────────────────────────────────────\n';
  text += `💵 Ticket Médio (Entrada): ${formatCurrencyBR(ticketMedioEntrada).padStart(12)}\n`;
  text += `💸 Ticket Médio (Saída):   ${formatCurrencyBR(ticketMedioSaida).padStart(12)}\n`;
  text += `📊 Margem Operacional:     ${formatNumberBR(margemOperacional, 1).padStart(12)}%\n\n`;

  // Top Categorias (se fornecido)
  if (additionalData?.categoryTotals) {
    const topDespesas = additionalData.categoryTotals
      .filter(cat => cat.valor < 0)
      .slice(0, 5);

    const topReceitas = additionalData.categoryTotals
      .filter(cat => cat.valor > 0)
      .slice(0, 5);

    if (topDespesas.length > 0) {
      text += '💸 TOP 5 CATEGORIAS DE DESPESAS\n';
      text += '─────────────────────────────────────────────\n';
      topDespesas.forEach((cat, index) => {
        const valor = formatCurrencyBR(Math.abs(cat.valor)).padStart(15);
        text += `${(index + 1).toString().padStart(2)}. ${cat.categoria.padEnd(25)} ${valor}\n`;
      });
      text += '\n';
    }

    if (topReceitas.length > 0) {
      text += '💰 TOP 5 CATEGORIAS DE RECEITAS\n';
      text += '─────────────────────────────────────────────\n';
      topReceitas.forEach((cat, index) => {
        const valor = formatCurrencyBR(cat.valor).padStart(15);
        text += `${(index + 1).toString().padStart(2)}. ${cat.categoria.padEnd(25)} ${valor}\n`;
      });
      text += '\n';
    }
  }

  // Fluxo Semanal Resumido (se fornecido)
  if (additionalData?.weeklyCashFlow && additionalData.weeklyCashFlow.length > 0) {
    text += '📅 FLUXO DE CAIXA SEMANAL\n';
    text += '─────────────────────────────────────────────\n';

    const semanas = additionalData.weeklyCashFlow.slice(0, 8); // Primeiras 8 semanas
    semanas.forEach(semana => {
      const valor = formatCurrencyBR(semana.valor).padStart(15);
      const indicador = semana.valor >= 0 ? '📈' : '📉';
      text += `${indicador} Semana ${semana.semana.toString().padStart(2)}: ${valor}\n`;
    });

    if (additionalData.weeklyCashFlow.length > 8) {
      text += `... e mais ${additionalData.weeklyCashFlow.length - 8} semanas\n`;
    }
    text += '\n';
  }

  // Rodapé
  text += '===============================================\n';
  text += '            🏥 CLÍNICA BASILE 🏥\n';
  text += '      Sistema de Gestão Financeira v1.0\n';
  text += '===============================================\n';

  return text;
}

/**
 * Exporta resumo operacional como arquivo TXT
 */
export async function exportResumoOperacional(
  summary: OperationalSummary,
  config: ExportConfig,
  additionalData?: {
    categoryTotals?: CategoryTotal[];
    topExpenses?: TopTransaction[];
    topRevenues?: TopTransaction[];
    weeklyCashFlow?: WeeklyCashFlow[];
  }
): Promise<ExportResult> {
  try {
    const filename = generateStandardFilename('resumo_operacional', config.ano, config.mes, 'txt');

    const textContent = generateOperationalSummaryText(
      summary, 
      config.ano, 
      config.mes, 
      additionalData
    );

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    saveAs(blob, filename);

    return { success: true, filename };
  } catch (error) {
    return { 
      success: false, 
      filename: '', 
      error: error instanceof Error ? error.message : 'Erro na exportação de resumo operacional' 
    };
  }
}

// ========================================================================================
// FUNÇÕES DE EXPORTAÇÃO EM LOTE
// ========================================================================================

/**
 * Interface para dados completos de exportação
 */
export interface CompleteExportData {
  transactions: ClassifiedTransaction[];
  operationalSummary: OperationalSummary;
  categoryTotals: CategoryTotal[];
  weeklyCashFlow: WeeklyCashFlow[];
  topExpenses: TopTransaction[];
  topRevenues: TopTransaction[];
  funcionarios?: string[];
  fornecedores?: string[];
}

/**
 * Exporta todos os relatórios de uma vez
 */
export async function exportAllReports(
  data: CompleteExportData,
  config: ExportConfig,
  formats: {
    includeCSV?: boolean;
    includeXLSX?: boolean;
    includeTXT?: boolean;
    includePNG?: boolean;
  } = { includeCSV: true, includeXLSX: true, includeTXT: true, includePNG: false }
): Promise<{
  results: ExportResult[];
  summary: {
    successful: number;
    failed: number;
    total: number;
  };
}> {
  const results: ExportResult[] = [];

  try {
    // CSV Exports
    if (formats.includeCSV) {
      const csvExports = await Promise.all([
        exportExtratoPadronizado(
          data.transactions, 
          config,
          data.funcionarios || [],
          data.fornecedores || []
        ),
        exportCategorias(data.categoryTotals, config),
        exportFluxoSemanal(data.weeklyCashFlow, config),
        exportTop10Despesas(data.topExpenses, config),
        exportTop10Receitas(data.topRevenues, config)
      ]);
      results.push(...csvExports);
    }

    // TXT Export
    if (formats.includeTXT) {
      const txtResult = await exportResumoOperacional(
        data.operationalSummary,
        config,
        {
          categoryTotals: data.categoryTotals,
          topExpenses: data.topExpenses,
          topRevenues: data.topRevenues,
          weeklyCashFlow: data.weeklyCashFlow
        }
      );
      results.push(txtResult);
    }

    // PNG Exports (requer IDs dos elementos DOM)
    if (formats.includePNG) {
      // Nota: PNG exports devem ser chamados individualmente com IDs específicos
      // Esta implementação serve como base para chamadas futuras
    }

  } catch (error) {
    results.push({
      success: false,
      filename: 'batch_export',
      error: error instanceof Error ? error.message : 'Erro no lote de exportações'
    });
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    results,
    summary: {
      successful,
      failed,
      total: results.length
    }
  };
}

/**
 * Exporta todos os relatórios como arquivo ZIP com estrutura de pastas
 * 
 * Esta é a função principal para resolver o problema de criação de pastas no navegador.
 * Cria um arquivo ZIP único com a estrutura virtual: outputs/YYYY-MM_ClinicaBasile/
 * 
 * Inclui todos os 8 tipos de arquivo conforme especificação:
 * 1. extrato_padronizado_YYYY-MM.csv
 * 2. resumo_operacional_YYYY-MM.txt  
 * 3. categorias_YYYY-MM.csv
 * 4. fluxo_semanal_YYYY-MM.csv
 * 5. top10_despesas_YYYY-MM.csv
 * 6. top10_receitas_YYYY-MM.csv
 * 7. grafico_despesas_categoria_YYYY-MM.png (se elementId fornecido)
 * 8. grafico_fluxo_semanal_YYYY-MM.png (se elementId fornecido)
 */
export async function exportAllReportsAsZip(
  data: CompleteExportData,
  config: ExportConfig,
  options: {
    chartElementIds?: {
      expensesChart?: string;
      cashFlowChart?: string;
    };
  } = {}
): Promise<ExportResult> {
  try {
    const zip = new JSZip();
    const folderName = generateFolderName(config.ano, config.mes).replace('outputs/', '');
    const folder = zip.folder(folderName);

    if (!folder) {
      throw new Error('Erro ao criar pasta no arquivo ZIP');
    }

    // 1. Extrato Padronizado (CSV) com classificação avançada
    const { classifyTransactionAdvanced } = await import('./classification-rules');
    
    const extratoData = data.transactions.map(transaction => {
      const advancedClassification = classifyTransactionAdvanced(
        transaction.historico,
        transaction.valor,
        transaction.dateISO,
        data.funcionarios || [],
        data.fornecedores || []
      );
      
      return {
        'Data': formatDateBR(transaction.dateISO),
        'Histórico': transaction.historico,
        'Documento': transaction.documento || '',
        'Valor': formatNumberBR(transaction.valor),
        'Saldo': transaction.saldo ? formatNumberBR(transaction.saldo) : '',
        'Categoria': transaction.categoria,
        'Operacional': transaction.ehOperacional ? 'Sim' : 'Não',
        'Classificacao_Final': advancedClassification.classificacaoFinal,
        'Eh_MovtoFinanceiro': advancedClassification.ehMovtoFinanceiro ? 'Sim' : 'Não',
        'Eh_Imposto': advancedClassification.ehImposto ? 'Sim' : 'Não',
        'Eh_SalarioConfirmado': advancedClassification.salarioConfirmado ? 'Sim' : 'Não',
        'Eh_SalarioHeuristico': advancedClassification.ehSalarioHeuristico ? 'Sim' : 'Não',
        'Precisa_Revisao': advancedClassification.needsReview ? 'Sim' : 'Não',
        'Motivo_Revisao': advancedClassification.reviewReason || '',
        'Score_Confianca': formatNumberBR(advancedClassification.confidenceScore * 100, 1) + '%',
        'Mês': transaction.mes,
        'Ano': transaction.ano,
        'Semana ISO': transaction.isoWeek
      };
    });
    const extratoCSV = convertToCSV(extratoData);
    const extratoFilename = generateStandardFilename('extrato_padronizado', config.ano, config.mes, 'csv');
    folder.file(extratoFilename, extratoCSV);

    // 2. Resumo Operacional (TXT)
    const resumoText = generateOperationalSummaryText(
      data.operationalSummary,
      config.ano,
      config.mes,
      {
        categoryTotals: data.categoryTotals,
        topExpenses: data.topExpenses,
        topRevenues: data.topRevenues,
        weeklyCashFlow: data.weeklyCashFlow
      }
    );
    const resumoFilename = generateStandardFilename('resumo_operacional', config.ano, config.mes, 'txt');
    folder.file(resumoFilename, resumoText);

    // 3. Categorias (CSV)
    const categoriasData = data.categoryTotals.map((category, index) => ({
      'Ranking': index + 1,
      'Categoria': category.categoria,
      'Valor Total': formatNumberBR(category.valor),
      'Valor Formatado': formatCurrencyBR(category.valor),
      'Tipo': category.valor >= 0 ? 'Receita' : 'Despesa'
    }));
    const categoriasCSV = convertToCSV(categoriasData);
    const categoriasFilename = generateStandardFilename('categorias', config.ano, config.mes, 'csv');
    folder.file(categoriasFilename, categoriasCSV);

    // 4. Fluxo Semanal (CSV)
    const fluxoData = data.weeklyCashFlow.map(week => ({
      'Semana ISO': week.semana,
      'Valor Total': formatNumberBR(week.valor),
      'Valor Formatado': formatCurrencyBR(week.valor),
      'Tipo Fluxo': week.valor >= 0 ? 'Entrada Líquida' : 'Saída Líquida',
      'Ano': config.ano
    }));
    const fluxoCSV = convertToCSV(fluxoData);
    const fluxoFilename = generateStandardFilename('fluxo_semanal', config.ano, config.mes, 'csv');
    folder.file(fluxoFilename, fluxoCSV);

    // 5. Top 10 Despesas (CSV)
    const despesasData = data.topExpenses.map((expense, index) => ({
      'Ranking': index + 1,
      'Data': formatDateBR(expense.data),
      'Histórico': expense.historico,
      'Categoria': expense.categoria,
      'Valor': formatNumberBR(Math.abs(expense.valor)),
      'Valor Formatado': formatCurrencyBR(Math.abs(expense.valor)),
      'Valor Original': formatNumberBR(expense.valor)
    }));
    const despesasCSV = convertToCSV(despesasData);
    const despesasFilename = generateStandardFilename('top10_despesas', config.ano, config.mes, 'csv');
    folder.file(despesasFilename, despesasCSV);

    // 6. Top 10 Receitas (CSV)  
    const receitasData = data.topRevenues.map((revenue, index) => ({
      'Ranking': index + 1,
      'Data': formatDateBR(revenue.data),
      'Histórico': revenue.historico,
      'Categoria': revenue.categoria,
      'Valor': formatNumberBR(revenue.valor),
      'Valor Formatado': formatCurrencyBR(revenue.valor)
    }));
    const receitasCSV = convertToCSV(receitasData);
    const receitasFilename = generateStandardFilename('top10_receitas', config.ano, config.mes, 'csv');
    folder.file(receitasFilename, receitasCSV);

    // 7. Gráfico de Despesas por Categoria (PNG) - Opcional
    if (options.chartElementIds?.expensesChart) {
      try {
        const element = document.getElementById(options.chartElementIds.expensesChart);
        if (element) {
          const canvas = await html2canvas(element, {
            width: 1200,
            height: 800,
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: false
          });

          const imageBlob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
            }, 'image/png');
          });

          const graficoCategoriasFilename = generateStandardFilename('grafico_despesas_categoria', config.ano, config.mes, 'png');
          folder.file(graficoCategoriasFilename, imageBlob);
        }
      } catch (error) {
        console.warn('Erro ao capturar gráfico de categorias:', error);
      }
    }

    // 8. Gráfico de Fluxo Semanal (PNG) - Opcional  
    if (options.chartElementIds?.cashFlowChart) {
      try {
        const element = document.getElementById(options.chartElementIds.cashFlowChart);
        if (element) {
          const canvas = await html2canvas(element, {
            width: 1400,
            height: 600,
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: false
          });

          const imageBlob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
            }, 'image/png');
          });

          const graficoFluxoFilename = generateStandardFilename('grafico_fluxo_semanal', config.ano, config.mes, 'png');
          folder.file(graficoFluxoFilename, imageBlob);
        }
      } catch (error) {
        console.warn('Erro ao capturar gráfico de fluxo:', error);
      }
    }

    // Gera o arquivo ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Nome do arquivo ZIP conforme especificação
    const mesFormatado = config.mes.toString().padStart(2, '0');
    const zipFilename = `GastosClinicaBasile_${config.ano}-${mesFormatado}.zip`;

    // Faz download do ZIP
    saveAs(zipBlob, zipFilename);

    return {
      success: true,
      filename: zipFilename
    };

  } catch (error) {
    return {
      success: false,
      filename: '',
      error: error instanceof Error ? error.message : 'Erro ao gerar arquivo ZIP'
    };
  }
}

// ========================================================================================
// UTILITÁRIOS DE VALIDAÇÃO
// ========================================================================================

/**
 * Valida dados antes da exportação
 */
export function validateExportData(data: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validações básicas
  if (!data) {
    errors.push('Dados não fornecidos para exportação');
    return { isValid: false, errors, warnings };
  }

  if (Array.isArray(data) && data.length === 0) {
    warnings.push('Array de dados vazio - arquivo exportado será vazio');
  }

  // Validação de estrutura para objetos
  if (typeof data === 'object' && !Array.isArray(data)) {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      warnings.push('Objeto de dados vazio');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Verifica suporte do navegador para downloads
 */
export function checkBrowserSupport(): {
  supportsDownload: boolean;
  supportsBlob: boolean;
  supportsCanvas: boolean;
  recommendations: string[];
} {
  const recommendations: string[] = [];

  const supportsDownload = 'download' in document.createElement('a');
  const supportsBlob = typeof Blob !== 'undefined';
  const supportsCanvas = typeof HTMLCanvasElement !== 'undefined';

  if (!supportsDownload) {
    recommendations.push('Navegador não suporta download direto - usar saveAs alternativo');
  }

  if (!supportsBlob) {
    recommendations.push('Navegador não suporta Blob - funcionalidade limitada');
  }

  if (!supportsCanvas) {
    recommendations.push('Navegador não suporta Canvas - exportação PNG indisponível');
  }

  return {
    supportsDownload,
    supportsBlob,
    supportsCanvas,
    recommendations
  };
}

// Função para exportar relatório de categorias
export function exportRelatorioCategorias(data: any, formato: 'xlsx' | 'pdf' = 'xlsx') {
  console.log('Exportando relatório de categorias:', { data, formato });
  // Implementação básica - pode ser expandida conforme necessário
  if (formato === 'xlsx') {
    // Lógica para Excel
    console.log('Exportando para Excel...');
  } else {
    // Lógica para PDF
    console.log('Exportando para PDF...');
  }
}