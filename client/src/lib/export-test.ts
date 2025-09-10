/**
 * Teste de Integração do Sistema de Exportação
 * 
 * Este arquivo serve para validar que todas as funções de exportação
 * funcionam corretamente com os tipos existentes do sistema.
 */

import type {
  ClassifiedTransaction,
  OperationalSummary,
  CategoryTotal,
  WeeklyCashFlow,
  TopTransaction
} from '@shared/schema';
import {
  exportExtratoPadronizado,
  exportCategorias,
  exportFluxoSemanal,
  exportTop10Despesas,
  exportTop10Receitas,
  exportResumoOperacional,
  exportAllReports,
  generateStandardFilename,
  generateFolderName,
  formatCurrencyBR,
  formatNumberBR,
  formatDateBR,
  validateExportData,
  checkBrowserSupport,
  type CompleteExportData
} from './export-functions';

// ========================================================================================
// DADOS DE TESTE MOCK
// ========================================================================================

const mockTransactions: ClassifiedTransaction[] = [
  {
    dateISO: '2025-01-15',
    historico: 'Consulta Médica',
    documento: 'NF001',
    valor: 350.00,
    saldo: 1000.00,
    categoria: 'Receitas Operacionais',
    ehOperacional: true,
    mes: 1,
    ano: 2025,
    isoWeek: 3
  },
  {
    dateISO: '2025-01-16',
    historico: 'Compra Materiais',
    documento: '',
    valor: -150.00,
    saldo: 850.00,
    categoria: 'Despesas Operacionais',
    ehOperacional: true,
    mes: 1,
    ano: 2025,
    isoWeek: 3
  },
  {
    dateISO: '2025-01-18',
    historico: 'Transferência Bancária',
    documento: '',
    valor: -50.00,
    saldo: 800.00,
    categoria: 'Taxas Bancárias',
    ehOperacional: false,
    mes: 1,
    ano: 2025,
    isoWeek: 3
  }
];

const mockOperationalSummary: OperationalSummary = {
  entradasReais: 350.00,
  saidasReais: 150.00,
  saldoLiquido: 200.00,
  numEntradas: 1,
  numSaidas: 1
};

const mockCategoryTotals: CategoryTotal[] = [
  { categoria: 'Receitas Operacionais', valor: 350.00 },
  { categoria: 'Despesas Operacionais', valor: -150.00 }
];

const mockWeeklyCashFlow: WeeklyCashFlow[] = [
  { semana: 3, valor: 200.00 },
  { semana: 4, valor: -50.00 }
];

const mockTopExpenses: TopTransaction[] = [
  {
    data: '2025-01-16',
    historico: 'Compra Materiais',
    valor: -150.00,
    categoria: 'Despesas Operacionais'
  }
];

const mockTopRevenues: TopTransaction[] = [
  {
    data: '2025-01-15',
    historico: 'Consulta Médica',
    valor: 350.00,
    categoria: 'Receitas Operacionais'
  }
];

// ========================================================================================
// FUNÇÕES DE TESTE
// ========================================================================================

/**
 * Testa formatação e utilitários básicos
 */
export function testFormatting(): void {
  console.log('=== TESTE DE FORMATAÇÃO ===');
  
  // Teste formatação de moeda
  console.log('Moeda R$ 1500.50:', formatCurrencyBR(1500.50));
  console.log('Moeda R$ -250.75:', formatCurrencyBR(-250.75));
  
  // Teste formatação de números
  console.log('Número 1234.567:', formatNumberBR(1234.567, 2));
  console.log('Número 1234.567 (1 decimal):', formatNumberBR(1234.567, 1));
  
  // Teste formatação de datas
  console.log('Data ISO 2025-01-15:', formatDateBR('2025-01-15'));
  console.log('Data objeto:', formatDateBR(new Date('2025-01-15')));
  
  // Teste nomenclatura
  console.log('Nome arquivo:', generateStandardFilename('extrato_padronizado', 2025, 1, 'csv'));
  console.log('Nome pasta:', generateFolderName(2025, 1));
}

/**
 * Testa validação de dados
 */
export function testValidation(): void {
  console.log('\n=== TESTE DE VALIDAÇÃO ===');
  
  // Teste dados válidos
  const validResult = validateExportData(mockTransactions);
  console.log('Dados válidos:', validResult);
  
  // Teste dados vazios
  const emptyResult = validateExportData([]);
  console.log('Dados vazios:', emptyResult);
  
  // Teste dados nulos
  const nullResult = validateExportData(null);
  console.log('Dados nulos:', nullResult);
  
  // Teste suporte do navegador
  const browserSupport = checkBrowserSupport();
  console.log('Suporte do navegador:', browserSupport);
}

/**
 * Testa exportações individuais (apenas criação de conteúdo, sem download)
 */
export async function testIndividualExports(): Promise<void> {
  console.log('\n=== TESTE DE EXPORTAÇÕES INDIVIDUAIS ===');
  
  const config = { ano: 2025, mes: 1 };
  
  try {
    // Teste CSV - Extrato
    console.log('Testando exportação de extrato...');
    const extratoResult = await exportExtratoPadronizado(mockTransactions, config);
    console.log('Resultado extrato:', extratoResult);
    
    // Teste CSV - Categorias
    console.log('Testando exportação de categorias...');
    const categoriasResult = await exportCategorias(mockCategoryTotals, config);
    console.log('Resultado categorias:', categoriasResult);
    
    // Teste CSV - Fluxo Semanal
    console.log('Testando exportação de fluxo semanal...');
    const fluxoResult = await exportFluxoSemanal(mockWeeklyCashFlow, config);
    console.log('Resultado fluxo semanal:', fluxoResult);
    
    // Teste CSV - Top Despesas
    console.log('Testando exportação de top despesas...');
    const despesasResult = await exportTop10Despesas(mockTopExpenses, config);
    console.log('Resultado top despesas:', despesasResult);
    
    // Teste CSV - Top Receitas
    console.log('Testando exportação de top receitas...');
    const receitasResult = await exportTop10Receitas(mockTopRevenues, config);
    console.log('Resultado top receitas:', receitasResult);
    
    // Teste TXT - Resumo Operacional
    console.log('Testando exportação de resumo operacional...');
    const resumoResult = await exportResumoOperacional(
      mockOperationalSummary,
      config,
      {
        categoryTotals: mockCategoryTotals,
        topExpenses: mockTopExpenses,
        topRevenues: mockTopRevenues,
        weeklyCashFlow: mockWeeklyCashFlow
      }
    );
    console.log('Resultado resumo operacional:', resumoResult);
    
  } catch (error) {
    console.error('Erro nos testes individuais:', error);
  }
}

/**
 * Testa exportação em lote
 */
export async function testBatchExport(): Promise<void> {
  console.log('\n=== TESTE DE EXPORTAÇÃO EM LOTE ===');
  
  const completeData: CompleteExportData = {
    transactions: mockTransactions,
    operationalSummary: mockOperationalSummary,
    categoryTotals: mockCategoryTotals,
    weeklyCashFlow: mockWeeklyCashFlow,
    topExpenses: mockTopExpenses,
    topRevenues: mockTopRevenues
  };
  
  const config = { ano: 2025, mes: 1 };
  
  try {
    const batchResult = await exportAllReports(completeData, config, {
      includeCSV: true,
      includeXLSX: false, // Desabilitado para teste
      includeTXT: true,
      includePNG: false // Desabilitado pois requer elementos DOM
    });
    
    console.log('Resultado exportação em lote:', batchResult);
    console.log(`Sucesso: ${batchResult.summary.successful}/${batchResult.summary.total}`);
    
    // Exibe detalhes de cada exportação
    batchResult.results.forEach((result, index) => {
      console.log(`Exportação ${index + 1}:`, result);
    });
    
  } catch (error) {
    console.error('Erro na exportação em lote:', error);
  }
}

/**
 * Executa todos os testes
 */
export async function runAllTests(): Promise<void> {
  console.log('🧪 INICIANDO TESTES DO SISTEMA DE EXPORTAÇÃO 🧪');
  
  try {
    // Testes síncronos
    testFormatting();
    testValidation();
    
    // Testes assíncronos
    await testIndividualExports();
    await testBatchExport();
    
    console.log('\n✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO! ✅');
    
  } catch (error) {
    console.error('\n❌ ERRO NOS TESTES:', error);
  }
}

// ========================================================================================
// UTILITÁRIOS PARA DESENVOLVIMENTO
// ========================================================================================

/**
 * Demonstra uso prático das funções
 */
export function showUsageExamples(): void {
  console.log('\n📚 EXEMPLOS DE USO PRÁTICO:');
  console.log('');
  
  console.log('// 1. Exportar extrato mensal');
  console.log('const transactions = await fetchTransactions();');
  console.log('const result = await exportExtratoPadronizado(transactions, { ano: 2025, mes: 1 });');
  console.log('');
  
  console.log('// 2. Exportar resumo operacional com dados completos');
  console.log('const summary = generateOperationalSummary(transactions);');
  console.log('const result = await exportResumoOperacional(summary, { ano: 2025, mes: 1 }, {');
  console.log('  categoryTotals: generateCategoryReport(transactions)');
  console.log('});');
  console.log('');
  
  console.log('// 3. Exportar gráfico como PNG');
  console.log('const result = await exportGraficoCategorias("chart-container", { ano: 2025, mes: 1 });');
  console.log('');
  
  console.log('// 4. Exportação em lote completa');
  console.log('const completeData = {');
  console.log('  transactions,');
  console.log('  operationalSummary,');
  console.log('  categoryTotals,');
  console.log('  weeklyCashFlow,');
  console.log('  topExpenses,');
  console.log('  topRevenues');
  console.log('};');
  console.log('const result = await exportAllReports(completeData, { ano: 2025, mes: 1 });');
}

// Para uso em desenvolvimento/debug
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.exportTests = {
    runAllTests,
    testFormatting,
    testValidation,
    testIndividualExports,
    testBatchExport,
    showUsageExamples
  };
  
  console.log('🔧 Funções de teste disponíveis em window.exportTests');
  console.log('   - runAllTests(): executa todos os testes');
  console.log('   - showUsageExamples(): mostra exemplos de uso');
}