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
  type TopTransaction
} from '@shared/schema';
import { getISOWeek, parseISO } from 'date-fns';

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
  // Filtra apenas transações operacionais
  const operationalTransactions = transactions.filter(t => t.ehOperacional);
  
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
  // Filtra apenas transações operacionais
  const operationalTransactions = transactions.filter(t => t.ehOperacional);
  
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
  // Filtra apenas transações operacionais
  const operationalTransactions = transactions.filter(t => t.ehOperacional);
  
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
  // Filtra apenas transações operacionais com valor negativo (despesas)
  const expenseTransactions = transactions.filter(t => t.ehOperacional && t.valor < 0);
  
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
  // Filtra apenas transações operacionais com valor positivo (receitas)
  const revenueTransactions = transactions.filter(t => t.ehOperacional && t.valor > 0);
  
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