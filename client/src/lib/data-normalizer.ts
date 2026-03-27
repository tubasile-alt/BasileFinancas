/**
 * Sistema de Normalização de Dados Bancários - Clínica Basile
 * 
 * Normaliza dados bancários brutos para estrutura padronizada:
 * - Datas: pt-BR para ISO format
 * - Valores: strings monetárias para numbers
 * - Histórico: preserva original, normaliza para classificação
 * - Detecção automática de mês/ano/semana
 * - Integração com sistema de classificação
 */

import { 
  type ClassifiedTransaction, 
  type BankTransaction 
} from '@shared/schema';
import { type RawTransaction } from './file-parsers';
import { classifyTransactionAnalytical } from './classification-rules';
import { getISOWeek, parseISO, format, isValid } from 'date-fns';

/**
 * Resultado da normalização
 */
export interface NormalizationResult {
  transactions: ClassifiedTransaction[];
  warnings: string[];
  metadata: {
    totalProcessed: number;
    validTransactions: number;
    skippedTransactions: number;
    detectedMonths: Set<string>; // YYYY-MM format
    predominantMonth?: string;
    predominantYear?: number;
  };
}

/**
 * Configuração de normalização
 */
export interface NormalizationConfig {
  strictDateValidation?: boolean;
  allowMultipleMonths?: boolean;
  preserveOriginalHistory?: boolean;
  logSkippedRows?: boolean;
}

const DEFAULT_CONFIG: NormalizationConfig = {
  strictDateValidation: true,
  allowMultipleMonths: true,
  preserveOriginalHistory: true,
  logSkippedRows: true,
};

/**
 * Normaliza data de formato brasileiro para ISO
 * Suporta múltiplos formatos de entrada
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error('Data é obrigatória');
  }

  // Remove espaços e caracteres especiais, mantém apenas números, /, -, .
  const cleanDate = dateStr.trim().replace(/[^\d\/\-\.]/g, '');
  
  if (!cleanDate) {
    throw new Error('Data inválida após limpeza');
  }

  // Formatos suportados em ordem de precedência
  const formats = [
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, order: [0, 1, 2] }, // YYYY-MM-DD (ISO - já correto)
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, order: [2, 1, 0] }, // DD/MM/YYYY (brasileiro)
    { regex: /^(\d{2})-(\d{2})-(\d{4})$/, order: [2, 1, 0] }, // DD-MM-YYYY
    { regex: /^(\d{2})\.(\d{2})\.(\d{4})$/, order: [2, 1, 0] }, // DD.MM.YYYY
    { regex: /^(\d{4})(\d{2})(\d{2})$/, order: [0, 1, 2] }, // YYYYMMDD (compacto)
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: [2, 1, 0] }, // D/M/YYYY ou DD/M/YYYY
    { regex: /^(\d{4})\/(\d{2})\/(\d{2})$/, order: [0, 1, 2] }, // YYYY/MM/DD
  ];

  for (const format of formats) {
    const match = cleanDate.match(format.regex);
    if (match) {
      const parts = [match[1], match[2], match[3]];
      const [year, month, day] = format.order.map(i => parts[i]);
      
      // Se já está no formato ISO, retorna direto
      if (format.order[0] === 0 && format.order[1] === 1 && format.order[2] === 2) {
        const isoDate = cleanDate;
        if (isValidISODate(isoDate)) {
          return isoDate;
        }
      }
      
      // Constrói data no formato ISO
      const normalizedYear = year.padStart(4, '0');
      const normalizedMonth = month.padStart(2, '0');
      const normalizedDay = day.padStart(2, '0');
      
      const isoDate = `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
      
      // Valida se a data é válida
      if (isValidISODate(isoDate)) {
        return isoDate;
      } else {
        throw new Error(`Data inválida: ${dateStr} -> ${isoDate}`);
      }
    }
  }

  throw new Error(`Formato de data não reconhecido: ${dateStr}`);
}

/**
 * Valida se uma string é uma data ISO válida
 */
function isValidISODate(isoDateStr: string): boolean {
  try {
    const date = parseISO(isoDateStr);
    return isValid(date) && format(date, 'yyyy-MM-dd') === isoDateStr;
  } catch {
    return false;
  }
}

/**
 * Normaliza valor monetário brasileiro para number
 * Suporta formatos: "R$ 1.234,56", "(1.234,56)", "1234.56", "1.234,56", etc.
 */
export function normalizeValue(valueStr: string | number): number {
  if (typeof valueStr === 'number') {
    return valueStr;
  }

  if (!valueStr || typeof valueStr !== 'string') {
    return 0;
  }

  // Remove espaços e converte para string
  let cleanValue = valueStr.toString().trim();
  
  if (!cleanValue) {
    return 0;
  }

  // Detecta se é negativo por parênteses ou sinal de menos
  const isNegative = cleanValue.includes('(') || cleanValue.startsWith('-');
  
  // Remove caracteres não numéricos (exceto vírgula e ponto)
  cleanValue = cleanValue.replace(/[^\d\,\.]/g, '');
  
  if (!cleanValue) {
    return 0;
  }

  // Lógica para vírgula e ponto:
  // Se tem vírgula e ponto: vírgula é separador de milhares, ponto é decimal
  // Se tem apenas vírgula: vírgula é separador decimal (formato brasileiro)
  // Se tem apenas ponto: pode ser decimal ou milhares (depende da posição)
  let normalizedValue = cleanValue;

  if (normalizedValue.includes(',') && normalizedValue.includes('.')) {
    // Formato: 1.234.567,89 ou 1,234,567.89
    const lastComma = normalizedValue.lastIndexOf(',');
    const lastDot = normalizedValue.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Formato brasileiro: 1.234,56
      normalizedValue = normalizedValue.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato americano: 1,234.56
      normalizedValue = normalizedValue.replace(/,/g, '');
    }
  } else if (normalizedValue.includes(',')) {
    // Apenas vírgula - formato brasileiro
    // Se vírgula está nos últimos 3 dígitos, é separador decimal
    const commaPos = normalizedValue.lastIndexOf(',');
    const afterComma = normalizedValue.substring(commaPos + 1);
    
    if (afterComma.length <= 2) {
      // É separador decimal: 1234,56
      normalizedValue = normalizedValue.replace(',', '.');
    } else {
      // É separador de milhares: 1,234 (improvável em pt-BR, mas suportado)
      normalizedValue = normalizedValue.replace(/,/g, '');
    }
  } else if (normalizedValue.includes('.')) {
    // Apenas ponto
    const dotPos = normalizedValue.lastIndexOf('.');
    const afterDot = normalizedValue.substring(dotPos + 1);
    
    if (afterDot.length <= 2 && dotPos > 0) {
      // Pode ser decimal: 1234.56
      const beforeDot = normalizedValue.substring(0, dotPos);
      if (beforeDot.length <= 3) {
        // Provavelmente decimal
        // Mantém como está
      } else {
        // Pode ser separador de milhares: 1234.567
        // Se tem mais de 2 dígitos após o ponto, trata como milhares
        if (afterDot.length > 2) {
          normalizedValue = normalizedValue.replace(/\./g, '');
        }
      }
    } else {
      // Múltiplos pontos ou formato atípico - trata como separador de milhares
      normalizedValue = normalizedValue.replace(/\./g, '');
    }
  }

  const numValue = parseFloat(normalizedValue);
  
  if (isNaN(numValue)) {
    throw new Error(`Valor inválido: ${valueStr}`);
  }

  return isNegative ? -Math.abs(numValue) : numValue;
}

/**
 * Normaliza histórico preservando original e criando versão para classificação
 */
export function normalizeHistory(historico: string): {
  original: string;
  normalized: string;
  forClassification: string;
} {
  if (!historico || typeof historico !== 'string') {
    return {
      original: '',
      normalized: '',
      forClassification: ''
    };
  }

  const original = historico;
  
  // Normalizado: trim espaços, remove caracteres especiais desnecessários
  const normalized = historico
    .trim()
    .replace(/\s+/g, ' ') // múltiplos espaços viram um
    .replace(/[^\w\s\-\.\/\(\)]/gi, ' ') // remove caracteres especiais exceto alguns úteis
    .trim();

  // Para classificação: UPPERCASE para busca case-insensitive
  const forClassification = normalized.toUpperCase();

  return {
    original,
    normalized,
    forClassification
  };
}

/**
 * Extrai mês e ano de uma data ISO
 */
export function extractMonthYear(isoDate: string): { month: number; year: number; yearMonth: string } {
  try {
    const date = parseISO(isoDate);
    if (!isValid(date)) {
      throw new Error(`Data inválida: ${isoDate}`);
    }

    const month = date.getMonth() + 1; // getMonth() retorna 0-11, queremos 1-12
    const year = date.getFullYear();
    const yearMonth = format(date, 'yyyy-MM');

    return { month, year, yearMonth };
  } catch (error) {
    throw new Error(`Erro ao extrair mês/ano de ${isoDate}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
  }
}

/**
 * Calcula semana ISO de uma data
 */
export function calculateISOWeek(isoDate: string): number {
  try {
    const date = parseISO(isoDate);
    if (!isValid(date)) {
      throw new Error(`Data inválida: ${isoDate}`);
    }

    return getISOWeek(date);
  } catch (error) {
    throw new Error(`Erro ao calcular semana ISO de ${isoDate}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
  }
}

/**
 * Converte RawTransaction para BankTransaction normalizada
 */
function rawToBankTransaction(raw: RawTransaction): BankTransaction {
  const dateISO = normalizeDate(raw.data);
  const valor = normalizeValue(raw.valor);
  const { normalized: historico } = normalizeHistory(raw.historico);
  
  return {
    dateISO,
    historico,
    documento: raw.documento,
    valor,
    saldo: raw.saldo
  };
}

/**
 * Converte BankTransaction para ClassifiedTransaction
 */
function bankToClassifiedTransaction(bank: BankTransaction): ClassifiedTransaction {
  // Extrai mês/ano/semana da data
  const { month, year } = extractMonthYear(bank.dateISO);
  const isoWeek = calculateISOWeek(bank.dateISO);

  // Classifica a transação
  const { normalized: historico, forClassification } = normalizeHistory(bank.historico);
  const classification = classifyTransactionAnalytical(forClassification, bank.valor);

  return {
    ...bank,
    historico, // usa a versão normalizada
    categoria: classification.categoriaMacro,
    ehOperacional: classification.ehOperacional,
    mes: month,
    ano: year,
    isoWeek,
    categoriaOrigemExtrato: classification.categoriaOrigemExtrato,
    categoriaMacro: classification.categoriaMacro,
    categoriaAnaliticaFinal: classification.categoriaAnaliticaFinal,
    regraAplicada: classification.regraAplicada,
    confidenceScore: classification.confidenceScore,
    requiresReview: classification.requiresReview
  };
}

/**
 * Detecta o mês/ano predominante nas transações
 */
function detectPredominantPeriod(transactions: ClassifiedTransaction[]): {
  predominantMonth: string;
  predominantYear: number;
  monthCounts: Map<string, number>;
} {
  const monthCounts = new Map<string, number>();

  // Conta ocorrências por mês
  for (const transaction of transactions) {
    const yearMonth = format(parseISO(transaction.dateISO), 'yyyy-MM');
    monthCounts.set(yearMonth, (monthCounts.get(yearMonth) || 0) + 1);
  }

  // Encontra o mês com mais transações
  let maxCount = 0;
  let predominantMonth = '';
  
  monthCounts.forEach((count, month) => {
    if (count > maxCount) {
      maxCount = count;
      predominantMonth = month;
    }
  });

  const predominantYear = predominantMonth ? parseInt(predominantMonth.split('-')[0]) : new Date().getFullYear();

  return {
    predominantMonth,
    predominantYear,
    monthCounts
  };
}

/**
 * Função principal: Normaliza transações brutas em transações classificadas
 */
export function normalizeTransactions(
  rawTransactions: RawTransaction[],
  config: NormalizationConfig = DEFAULT_CONFIG
): NormalizationResult {
  const warnings: string[] = [];
  const transactions: ClassifiedTransaction[] = [];
  const detectedMonths = new Set<string>();
  
  let totalProcessed = 0;
  let validTransactions = 0;
  let skippedTransactions = 0;

  for (let i = 0; i < rawTransactions.length; i++) {
    const raw = rawTransactions[i];
    totalProcessed++;

    try {
      // Valida dados obrigatórios
      if (!raw.data || raw.valor === undefined || raw.valor === null) {
        skippedTransactions++;
        if (config.logSkippedRows) {
          warnings.push(`Linha ${i + 1}: Dados obrigatórios ausentes (data ou valor)`);
        }
        continue;
      }

      if (!raw.historico || raw.historico.trim() === '') {
        skippedTransactions++;
        if (config.logSkippedRows) {
          warnings.push(`Linha ${i + 1}: Histórico obrigatório ausente`);
        }
        continue;
      }

      // Converte raw -> bank -> classified
      const bankTransaction = rawToBankTransaction(raw);
      const classifiedTransaction = bankToClassifiedTransaction(bankTransaction);

      // Adiciona mês detectado
      const yearMonth = format(parseISO(classifiedTransaction.dateISO), 'yyyy-MM');
      detectedMonths.add(yearMonth);

      transactions.push(classifiedTransaction);
      validTransactions++;

    } catch (error) {
      skippedTransactions++;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (config.logSkippedRows) {
        warnings.push(`Linha ${i + 1}: ${errorMsg}`);
      }
    }
  }

  // Detecta período predominante
  let predominantMonth: string | undefined;
  let predominantYear: number | undefined;

  if (transactions.length > 0) {
    const detected = detectPredominantPeriod(transactions);
    predominantMonth = detected.predominantMonth;
    predominantYear = detected.predominantYear;

    // Avisa sobre múltiplos meses se não permitido
    if (!config.allowMultipleMonths && detectedMonths.size > 1) {
      warnings.push(
        `Múltiplos meses detectados: ${Array.from(detectedMonths).join(', ')}. ` +
        `Mês predominante: ${predominantMonth}`
      );
    }
  }

  return {
    transactions,
    warnings,
    metadata: {
      totalProcessed,
      validTransactions,
      skippedTransactions,
      detectedMonths,
      predominantMonth,
      predominantYear
    }
  };
}

/**
 * Utilitários para validação e diagnóstico
 */

/**
 * Valida se todas as transações são do mesmo mês
 */
export function validateSingleMonth(transactions: ClassifiedTransaction[]): {
  isValid: boolean;
  months: string[];
  predominantMonth: string | null;
} {
  const months = new Set<string>();
  
  for (const transaction of transactions) {
    const yearMonth = format(parseISO(transaction.dateISO), 'yyyy-MM');
    months.add(yearMonth);
  }

  const monthsArray: string[] = [];
  months.forEach(month => monthsArray.push(month));
  const isValid = monthsArray.length <= 1;
  
  // Se há transações, pega o primeiro mês como predominante
  const predominantMonth = monthsArray.length > 0 ? monthsArray[0] : null;

  return {
    isValid,
    months: monthsArray,
    predominantMonth
  };
}

/**
 * Obtém estatísticas das transações normalizadas
 */
export function getNormalizationStats(result: NormalizationResult): {
  successRate: number;
  monthsDetected: number;
  categoriesFound: string[];
  operationalVsNonOperational: { operational: number; nonOperational: number };
  valueRange: { min: number; max: number; total: number };
} {
  const { transactions, metadata } = result;
  const successRate = metadata.totalProcessed > 0 
    ? (metadata.validTransactions / metadata.totalProcessed) * 100 
    : 0;

  const categorySet = new Set(transactions.map(t => t.categoria));
  const categoriesFound: string[] = [];
  categorySet.forEach(cat => categoriesFound.push(cat));
  
  const operational = transactions.filter(t => t.ehOperacional).length;
  const nonOperational = transactions.filter(t => !t.ehOperacional).length;
  
  const values = transactions.map(t => t.valor);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const total = values.reduce((sum, val) => sum + val, 0);

  return {
    successRate,
    monthsDetected: metadata.detectedMonths.size,
    categoriesFound,
    operationalVsNonOperational: { operational, nonOperational },
    valueRange: { min, max, total }
  };
}

// Funções utilitárias exportadas diretamente acima
