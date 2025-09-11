/**
 * Sistema de Geração de Relatórios Financeiros - Clínica Basile
 * 
 * Gera relatórios analíticos baseados em transações bancárias classificadas.
 * Foca exclusivamente em transações operacionais para análises de negócio.
 */

import { 
  type ClassifiedTransaction,
  type OperationalSummary,
  type CategoryTotal,
  type WeeklyCashFlow,
  type TopTransaction,
  type EnhancedOperationalSummary,
  type AnnotatedTransaction,
  type CategorizedTotal,
  type CategorizedTransactionList,
  type ReviewQueueItem,
  type UXMessages
} from '@shared/schema';
import { getISOWeek, parseISO } from 'date-fns';
import { 
  classifyTransactionAdvanced,
  type AdvancedClassificationResult,
  type ClassificationDictionaries
} from './classification-rules';

/**
 * 1. Resumo Operacional
 * 
 * Calcula resumo financeiro considerando apenas transações operacionais:
 * - Entradas reais: soma de valores positivos operacionais
 * - Saídas reais: soma de valores negativos operacionais (em valor absoluto)
 * - Saldo líquido: entradas - saídas
 * - Contadores de entradas e saídas
 */
export function generateOperationalSummary(transactions: ClassifiedTransaction[]): OperationalSummary {
  // Filtra apenas transações operacionais e remove transações a serem ignoradas
  const operationalTransactions = transactions.filter(t => 
    t.ehOperacional && !t.categoria.includes('IGNORAR')
  );
  
  let entradasReais = 0;
  let saidasReais = 0;
  let numEntradas = 0;
  let numSaidas = 0;

  for (const transaction of operationalTransactions) {
    if (transaction.valor > 0) {
      // Receita operacional
      entradasReais += transaction.valor;
      numEntradas++;
    } else if (transaction.valor < 0) {
      // Despesa operacional (converte para positivo para soma)
      saidasReais += Math.abs(transaction.valor);
      numSaidas++;
    }
    // Ignora valores zero
  }

  // Saldo líquido = entradas - saídas
  const saldoLiquido = entradasReais - saidasReais;

  return {
    entradasReais,
    saidasReais,
    saldoLiquido,
    numEntradas,
    numSaidas
  };
}

/**
 * 2. Relatório por Categoria
 * 
 * Agrupa transações operacionais por categoria e calcula totais.
 * Ordenação: despesas (negativas) da maior para menor, receitas (positivas) da maior para menor.
 */
export function generateCategoryReport(transactions: ClassifiedTransaction[]): CategoryTotal[] {
  // Filtra apenas transações operacionais e remove transações a serem ignoradas
  const operationalTransactions = transactions.filter(t => 
    t.ehOperacional && !t.categoria.includes('IGNORAR')
  );
  
  // Agrupa por categoria
  const categoryTotals = new Map<string, number>();

  for (const transaction of operationalTransactions) {
    const currentTotal = categoryTotals.get(transaction.categoria) || 0;
    categoryTotals.set(transaction.categoria, currentTotal + transaction.valor);
  }

  // Converte Map para array de CategoryTotal
  const categoryReport: CategoryTotal[] = [];
  categoryTotals.forEach((valor, categoria) => {
    categoryReport.push({ categoria, valor });
  });

  // Ordenação personalizada:
  // 1. Despesas (negativas) ordenadas da maior para menor (mais negativo primeiro)
  // 2. Receitas (positivas) ordenadas da maior para menor
  categoryReport.sort((a, b) => {
    // Se ambas são despesas (negativas), ordena da maior para menor (mais negativo primeiro)
    if (a.valor < 0 && b.valor < 0) {
      return a.valor - b.valor; // Menor valor (mais negativo) primeiro
    }
    
    // Se ambas são receitas (positivas), ordena da maior para menor
    if (a.valor > 0 && b.valor > 0) {
      return b.valor - a.valor; // Maior valor primeiro
    }
    
    // Se uma é despesa e outra é receita, despesas primeiro
    if (a.valor < 0 && b.valor > 0) {
      return -1; // Despesa (a) vem antes de receita (b)
    }
    
    if (a.valor > 0 && b.valor < 0) {
      return 1; // Receita (a) vem depois de despesa (b)
    }
    
    // Casos com valores zero (improvável, mas seguro)
    return b.valor - a.valor;
  });

  return categoryReport;
}

/**
 * 3. Fluxo de Caixa Semanal
 * 
 * Agrupa transações operacionais por semana ISO e calcula totais semanais.
 * Usa date-fns para cálculo preciso de semanas ISO.
 */
export function generateWeeklyCashFlow(transactions: ClassifiedTransaction[]): WeeklyCashFlow[] {
  // Filtra apenas transações operacionais e remove transações a serem ignoradas
  const operationalTransactions = transactions.filter(t => 
    t.ehOperacional && !t.categoria.includes('IGNORAR')
  );
  
  // Agrupa por semana ISO
  const weeklyTotals = new Map<number, number>();

  for (const transaction of operationalTransactions) {
    try {
      const date = parseISO(transaction.dateISO);
      const isoWeek = getISOWeek(date);
      
      const currentTotal = weeklyTotals.get(isoWeek) || 0;
      weeklyTotals.set(isoWeek, currentTotal + transaction.valor);
    } catch (error) {
      // Se a data for inválida, pula a transação
      console.warn(`Data inválida ignorada no fluxo semanal: ${transaction.dateISO}`, error);
    }
  }

  // Converte Map para array de WeeklyCashFlow
  const weeklyCashFlow: WeeklyCashFlow[] = [];
  weeklyTotals.forEach((valor, semana) => {
    weeklyCashFlow.push({ semana, valor });
  });

  // Ordena por semana
  weeklyCashFlow.sort((a, b) => a.semana - b.semana);

  return weeklyCashFlow;
}

/**
 * 4. Top 10 Maiores Despesas
 * 
 * Lista as 10 maiores despesas operacionais (valores negativos).
 * Ordenação: da maior despesa para menor (mais negativo primeiro).
 */
export function generateTop10Expenses(transactions: ClassifiedTransaction[]): TopTransaction[] {
  // Filtra apenas transações operacionais com valor negativo (despesas) e remove transações a serem ignoradas
  const expenseTransactions = transactions.filter(t => 
    t.ehOperacional && t.valor < 0 && !t.categoria.includes('IGNORAR')
  );
  
  // Converte para TopTransaction
  const expenses: TopTransaction[] = expenseTransactions.map(t => ({
    data: t.dateISO,
    historico: t.historico,
    valor: t.valor,
    categoria: t.categoria
  }));

  // Ordena por valor (menor valor = mais negativo primeiro)
  expenses.sort((a, b) => a.valor - b.valor);

  // Retorna apenas os top 10
  return expenses.slice(0, 10);
}

/**
 * 5. Top 10 Maiores Receitas
 * 
 * Lista as 10 maiores receitas operacionais (valores positivos).
 * Ordenação: da maior receita para menor.
 */
export function generateTop10Revenues(transactions: ClassifiedTransaction[]): TopTransaction[] {
  // Filtra apenas transações operacionais com valor positivo (receitas) e remove transações a serem ignoradas
  const revenueTransactions = transactions.filter(t => 
    t.ehOperacional && t.valor > 0 && !t.categoria.includes('IGNORAR')
  );
  
  // Converte para TopTransaction
  const revenues: TopTransaction[] = revenueTransactions.map(t => ({
    data: t.dateISO,
    historico: t.historico,
    valor: t.valor,
    categoria: t.categoria
  }));

  // Ordena por valor (maior valor primeiro)
  revenues.sort((a, b) => b.valor - a.valor);

  // Retorna apenas os top 10
  return revenues.slice(0, 10);
}

/**
 * Utilitários para Validação e Diagnóstico
 */

/**
 * Obtém estatísticas dos relatórios gerados
 */
export function getReportStats(transactions: ClassifiedTransaction[]): {
  totalTransactions: number;
  operationalTransactions: number;
  nonOperationalTransactions: number;
  operationalRate: number;
  categoriesCount: number;
  weeksSpanned: number;
  dateRange: { earliest: string; latest: string } | null;
} {
  const total = transactions.length;
  const operational = transactions.filter(t => t.ehOperacional).length;
  const nonOperational = total - operational;
  const operationalRate = total > 0 ? (operational / total) * 100 : 0;

  // Conta categorias únicas em transações operacionais
  const operationalTransactions = transactions.filter(t => t.ehOperacional);
  const categories = new Set(operationalTransactions.map(t => t.categoria));
  const categoriesCount = categories.size;

  // Calcula semanas abrangidas
  const weeks = new Set<number>();
  for (const transaction of operationalTransactions) {
    try {
      const date = parseISO(transaction.dateISO);
      const isoWeek = getISOWeek(date);
      weeks.add(isoWeek);
    } catch {
      // Ignora datas inválidas
    }
  }
  const weeksSpanned = weeks.size;

  // Calcula range de datas
  let dateRange: { earliest: string; latest: string } | null = null;
  if (transactions.length > 0) {
    const dates = transactions
      .map(t => t.dateISO)
      .sort();
    dateRange = {
      earliest: dates[0],
      latest: dates[dates.length - 1]
    };
  }

  return {
    totalTransactions: total,
    operationalTransactions: operational,
    nonOperationalTransactions: nonOperational,
    operationalRate,
    categoriesCount,
    weeksSpanned,
    dateRange
  };
}

/**
 * Valida se as transações estão adequadas para geração de relatórios
 */
export function validateTransactionsForReports(transactions: ClassifiedTransaction[]): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (transactions.length === 0) {
    errors.push("Nenhuma transação fornecida para gerar relatórios");
    return { isValid: false, warnings, errors };
  }

  const operationalCount = transactions.filter(t => t.ehOperacional).length;
  if (operationalCount === 0) {
    errors.push("Nenhuma transação operacional encontrada");
    return { isValid: false, warnings, errors };
  }

  // Verifica datas inválidas
  let invalidDatesCount = 0;
  for (const transaction of transactions) {
    try {
      parseISO(transaction.dateISO);
    } catch {
      invalidDatesCount++;
    }
  }

  if (invalidDatesCount > 0) {
    warnings.push(`${invalidDatesCount} transações com datas inválidas serão ignoradas nos cálculos semanais`);
  }

  // Verifica se há transações com valor zero
  const zeroValueCount = transactions.filter(t => t.valor === 0).length;
  if (zeroValueCount > 0) {
    warnings.push(`${zeroValueCount} transações com valor zero não afetarão os totais`);
  }

  // Verifica distribuição operacional vs não-operacional
  const nonOperationalRate = ((transactions.length - operationalCount) / transactions.length) * 100;
  if (nonOperationalRate > 50) {
    warnings.push(`${nonOperationalRate.toFixed(1)}% das transações são não-operacionais e serão excluídas dos relatórios`);
  }

  return {
    isValid: true,
    warnings,
    errors
  };
}

/**
 * SISTEMA AVANÇADO DE RELATÓRIOS
 * 
 * Novas funções que usam a classificação avançada para gerar relatórios aprimorados
 */

/**
 * Converte ClassifiedTransaction para AnnotatedTransaction usando classificação avançada
 * 
 * @param transactions - Array de transações classificadas
 * @param funcionarios - Lista opcional de funcionários
 * @param fornecedores - Lista opcional de fornecedores
 * @returns Array de transações anotadas com flags avançadas
 */
export function annotateTransactions(
  transactions: ClassifiedTransaction[],
  funcionarios?: string[],
  fornecedores?: string[]
): AnnotatedTransaction[] {
  return transactions.map(transaction => {
    const advanced = classifyTransactionAdvanced(
      transaction.historico,
      transaction.valor,
      transaction.dateISO,
      funcionarios,
      fornecedores
    );

    return {
      ...transaction,
      categoria: advanced.categoria,
      ehOperacional: advanced.ehOperacional,
      ehMovtoFinanceiro: advanced.ehMovtoFinanceiro,
      ehImposto: advanced.ehImposto,
      ehSalarioPalavra: advanced.ehSalarioPalavra,
      ehSalarioHeuristico: advanced.ehSalarioHeuristico,
      salarioConfirmado: advanced.salarioConfirmado,
      classificacaoFinal: advanced.classificacaoFinal,
      needsReview: advanced.needsReview
    };
  });
}

/**
 * Gera lista categorizada de transações
 * 
 * @param transactions - Array de transações anotadas
 * @param filterFn - Função para filtrar transações relevantes
 * @returns Objeto com total e lista de transações
 */
function generateCategorizedList(
  transactions: AnnotatedTransaction[],
  filterFn: (t: AnnotatedTransaction) => boolean
): CategorizedTotal {
  const filtered = transactions.filter(filterFn);
  
  const total = filtered.reduce((sum, t) => sum + Math.abs(t.valor), 0);
  
  const lista: CategorizedTransactionList[] = filtered.map(t => ({
    data: t.dateISO,
    historico: t.historico,
    valor: t.valor
  }));

  // Ordena por data (mais recente primeiro) e depois por valor absoluto (maior primeiro)
  lista.sort((a, b) => {
    const dateCompare = b.data.localeCompare(a.data);
    if (dateCompare !== 0) return dateCompare;
    return Math.abs(b.valor) - Math.abs(a.valor);
  });

  return { total, lista };
}

/**
 * Gera fila de revisão com motivos específicos
 * 
 * @param transactions - Array de transações anotadas
 * @returns Array de itens que precisam revisão
 */
function generateReviewQueue(transactions: AnnotatedTransaction[]): ReviewQueueItem[] {
  const reviewQueue: ReviewQueueItem[] = [];

  for (const transaction of transactions) {
    if (!transaction.needsReview) continue;

    let motivo = "";

    if (transaction.ehSalarioHeuristico && !transaction.salarioConfirmado) {
      motivo = "Possível salário detectado por heurística PIX - confirme se é funcionário";
    } else if (transaction.categoria === "Despesa – PIX Enviado" && 
               !transaction.ehSalarioHeuristico && 
               !transaction.ehImposto && 
               !transaction.ehMovtoFinanceiro) {
      motivo = "PIX enviado sem classificação específica - verificar beneficiário";
    } else if (transaction.categoria === "Outros") {
      motivo = "Transação não classificada automaticamente - requer análise manual";
    } else {
      motivo = "Transação marcada para revisão pelo sistema de classificação";
    }

    reviewQueue.push({
      data: transaction.dateISO,
      historico: transaction.historico,
      valor: transaction.valor,
      motivo
    });
  }

  // Ordena por data (mais recente primeiro) e depois por valor absoluto (maior primeiro)
  reviewQueue.sort((a, b) => {
    const dateCompare = b.data.localeCompare(a.data);
    if (dateCompare !== 0) return dateCompare;
    return Math.abs(b.valor) - Math.abs(a.valor);
  });

  return reviewQueue;
}

/**
 * Gera mensagens UX para o usuário
 * 
 * @param impostos - Dados dos impostos
 * @param salariosConfirmados - Dados dos salários confirmados
 * @param salariosHeuristicos - Dados dos salários heurísticos
 * @param movimentacoesFinanceiras - Dados das movimentações financeiras
 * @param filaRevisao - Lista de itens para revisão
 * @returns Objeto com mensagens formatadas
 */
function generateUXMessages(
  impostos: CategorizedTotal,
  salariosConfirmados: CategorizedTotal,
  salariosHeuristicos: CategorizedTotal,
  movimentacoesFinanceiras: CategorizedTotal,
  filaRevisao: ReviewQueueItem[]
): UXMessages {
  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return {
    impostos: `Impostos detectados: ${formatCurrency(impostos.total)}`,
    salariosConfirmados: `Salários (confirmados): ${formatCurrency(salariosConfirmados.total)}`,
    salariosHeuristicos: `Salários (heurístico): ${formatCurrency(salariosHeuristicos.total)} — revise e, se forem funcionários, inclua no funcionarios.csv`,
    movimentacoesFinanceiras: "Movimentações financeiras foram excluídas do operacional.",
    filaRevisao: filaRevisao.length > 0 ? 
      `${filaRevisao.length} transação(ões) precisam de revisão manual` : 
      undefined
  };
}

/**
 * FUNÇÃO PRINCIPAL: Resumo Operacional Avançado
 * 
 * Gera resumo completo usando o sistema avançado de classificação.
 * Exclui movimentações financeiras dos cálculos operacionais.
 * Inclui totais categorizados, listas detalhadas e fila de revisão.
 * 
 * @param transactions - Array de transações classificadas
 * @param funcionarios - Lista opcional de funcionários conhecidos
 * @param fornecedores - Lista opcional de fornecedores conhecidos
 * @returns Resumo operacional avançado completo
 */
export function generateEnhancedOperationalSummary(
  transactions: ClassifiedTransaction[],
  funcionarios?: string[],
  fornecedores?: string[]
): EnhancedOperationalSummary {
  // 1. Anota todas as transações com classificação avançada
  const annotated = annotateTransactions(transactions, funcionarios, fornecedores);
  
  // 2. Filtra transações operacionais (exclui movimentações financeiras)
  const operationalTransactions = annotated.filter(t => t.ehOperacional && !t.ehMovtoFinanceiro);
  
  // 3. Calcula totais operacionais básicos (mesmo algoritmo que a função original)
  let entradasReais = 0;
  let saidasReais = 0;
  let numEntradas = 0;
  let numSaidas = 0;

  for (const transaction of operationalTransactions) {
    if (transaction.valor > 0) {
      entradasReais += transaction.valor;
      numEntradas++;
    } else if (transaction.valor < 0) {
      saidasReais += Math.abs(transaction.valor);
      numSaidas++;
    }
  }

  const saldoLiquido = entradasReais - saidasReais;

  // 4. Gera listas categorizadas
  const impostos = generateCategorizedList(
    annotated,
    t => t.ehImposto
  );

  const salariosConfirmados = generateCategorizedList(
    annotated,
    t => t.salarioConfirmado || t.ehSalarioPalavra
  );

  const salariosHeuristicos = generateCategorizedList(
    annotated,
    t => t.ehSalarioHeuristico && !t.salarioConfirmado
  );

  const movimentacoesFinanceiras = generateCategorizedList(
    annotated,
    t => t.ehMovtoFinanceiro
  );

  // 5. Gera fila de revisão
  const filaRevisao = generateReviewQueue(annotated);

  return {
    // Campos do OperationalSummary original
    entradasReais,
    saidasReais,
    saldoLiquido,
    numEntradas,
    numSaidas,

    // Novos campos avançados
    impostos,
    salariosConfirmados,
    salariosHeuristicos,
    movimentacoesFinanceiras,
    filaRevisao
  };
}

/**
 * Gera mensagens UX para o resumo avançado
 * 
 * @param summary - Resumo operacional avançado
 * @returns Mensagens formatadas para o usuário
 */
export function generateEnhancedUXMessages(summary: EnhancedOperationalSummary): UXMessages {
  return generateUXMessages(
    summary.impostos,
    summary.salariosConfirmados,
    summary.salariosHeuristicos,
    summary.movimentacoesFinanceiras,
    summary.filaRevisao
  );
}

/**
 * Versão aprimorada do relatório por categoria que usa classificação avançada
 * 
 * @param transactions - Array de transações classificadas
 * @param funcionarios - Lista opcional de funcionários
 * @param fornecedores - Lista opcional de fornecedores
 * @returns Relatório por categoria com classificação avançada
 */
export function generateEnhancedCategoryReport(
  transactions: ClassifiedTransaction[],
  funcionarios?: string[],
  fornecedores?: string[]
): CategoryTotal[] {
  // Usa classificação avançada para recategorizar
  const annotated = annotateTransactions(transactions, funcionarios, fornecedores);
  
  // Aplica o mesmo algoritmo da função original, mas com as novas categorias
  return generateCategoryReport(annotated);
}

/**
 * Versão aprimorada das top despesas que usa classificação avançada
 * 
 * @param transactions - Array de transações classificadas
 * @param funcionarios - Lista opcional de funcionários
 * @param fornecedores - Lista opcional de fornecedores
 * @returns Top 10 despesas com classificação avançada
 */
export function generateEnhancedTop10Expenses(
  transactions: ClassifiedTransaction[],
  funcionarios?: string[],
  fornecedores?: string[]
): TopTransaction[] {
  // Usa classificação avançada
  const annotated = annotateTransactions(transactions, funcionarios, fornecedores);
  
  // Aplica o mesmo algoritmo da função original
  return generateTop10Expenses(annotated);
}

/**
 * Versão aprimorada das top receitas que usa classificação avançada
 * 
 * @param transactions - Array de transações classificadas
 * @param funcionarios - Lista opcional de funcionários
 * @param fornecedores - Lista opcional de fornecedores
 * @returns Top 10 receitas with advanced classification
 */
export function generateEnhancedTop10Revenues(
  transactions: ClassifiedTransaction[],
  funcionarios?: string[],
  fornecedores?: string[]
): TopTransaction[] {
  // Usa classificação avançada
  const annotated = annotateTransactions(transactions, funcionarios, fornecedores);
  
  // Aplica o mesmo algoritmo da função original
  return generateTop10Revenues(annotated);
}

/**
 * Versão aprimorada do fluxo de caixa semanal que usa classificação avançada
 * 
 * @param transactions - Array de transações classificadas
 * @param funcionarios - Lista opcional de funcionários
 * @param fornecedores - Lista opcional de fornecedores
 * @returns Fluxo de caixa semanal com classificação avançada
 */
export function generateEnhancedWeeklyCashFlow(
  transactions: ClassifiedTransaction[],
  funcionarios?: string[],
  fornecedores?: string[]
): WeeklyCashFlow[] {
  // Usa classificação avançada
  const annotated = annotateTransactions(transactions, funcionarios, fornecedores);
  
  // Aplica o mesmo algoritmo da função original
  return generateWeeklyCashFlow(annotated);
}

/**
 * Estatísticas do sistema avançado para diagnóstico
 */
export function getEnhancedReportStats(
  transactions: ClassifiedTransaction[],
  funcionarios?: string[],
  fornecedores?: string[]
): {
  totalTransactions: number;
  operationalTransactions: number;
  nonOperationalTransactions: number;
  financialMovements: number;
  taxes: number;
  confirmedSalaries: number;
  heuristicSalaries: number;
  reviewQueue: number;
  operationalRate: number;
  categorizationDetails: {
    movimentacoesFinanceiras: number;
    impostos: number;
    salariosConfirmados: number;
    salariosHeuristicos: number;
    precisamRevisao: number;
  };
} {
  const annotated = annotateTransactions(transactions, funcionarios, fornecedores);
  
  const total = annotated.length;
  const operational = annotated.filter(t => t.ehOperacional && !t.ehMovtoFinanceiro).length;
  const nonOperational = total - operational;
  const operationalRate = total > 0 ? (operational / total) * 100 : 0;
  
  const financialMovements = annotated.filter(t => t.ehMovtoFinanceiro).length;
  const taxes = annotated.filter(t => t.ehImposto).length;
  const confirmedSalaries = annotated.filter(t => t.salarioConfirmado || t.ehSalarioPalavra).length;
  const heuristicSalaries = annotated.filter(t => t.ehSalarioHeuristico && !t.salarioConfirmado).length;
  const reviewQueue = annotated.filter(t => t.needsReview).length;

  return {
    totalTransactions: total,
    operationalTransactions: operational,
    nonOperationalTransactions: nonOperational,
    financialMovements,
    taxes,
    confirmedSalaries,
    heuristicSalaries,
    reviewQueue,
    operationalRate,
    categorizationDetails: {
      movimentacoesFinanceiras: financialMovements,
      impostos: taxes,
      salariosConfirmados: confirmedSalaries,
      salariosHeuristicos: heuristicSalaries,
      precisamRevisao: reviewQueue
    }
  };
}