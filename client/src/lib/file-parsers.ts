/**
 * Sistema de Parsers para Arquivos Bancários - Clínica Basile
 * 
 * Suporte para formatos: CSV, XLSX, OFX, PDF
 * Converte diferentes formatos para estrutura padronizada
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist';
import { z } from 'zod';

// Set worker path for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * Tipo para transação bruta (antes da validação completa)
 */
export const rawTransactionSchema = z.object({
  data: z.string().min(1, "Data é obrigatória"),
  historico: z.string().min(1, "Histórico é obrigatório"), 
  documento: z.string().optional(),
  valor: z.number(),
  saldo: z.number().optional(),
});

export type RawTransaction = z.infer<typeof rawTransactionSchema>;

/**
 * Tipos de arquivo suportados
 */
export enum FileType {
  CSV = 'csv',
  XLSX = 'xlsx', 
  OFX = 'ofx',
  PDF = 'pdf'
}

/**
 * Configuração para mapeamento de colunas
 */
export interface ColumnMapping {
  data: string[];
  historico: string[];
  documento: string[];
  valor: string[];
  saldo: string[];
}

/**
 * Resultado do parsing
 */
export interface ParseResult {
  transactions: RawTransaction[];
  warnings: string[];
  metadata: {
    fileType: FileType;
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}

/**
 * Configuração padrão para mapeamento de colunas
 */
const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  data: ['data', 'date', 'dt', 'dtposted', 'data_movimento', 'data mov', 'data_transacao', 'movimento', 'lancamento'],
  historico: ['historico', 'descricao', 'description', 'memo', 'name', 'desc', 'detalhes', 'observacao', 'complemento', 'especificacao'],
  documento: ['documento', 'document', 'fitid', 'id', 'numero', 'ref', 'referencia', 'agencia', 'conta'],
  valor: ['valor', 'value', 'amount', 'trnamt', 'vlr', 'montante', 'quantia', 'credito', 'debito', 'lancamento'],
  saldo: ['saldo', 'balance', 'bal', 'saldo_atual', 'saldo final', 'saldo_final']
};

/**
 * Configurações de validação de arquivo
 */
const FILE_VALIDATION = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: {
    [FileType.CSV]: ['text/csv', 'application/csv', 'text/plain'],
    [FileType.XLSX]: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
    [FileType.OFX]: ['application/x-ofx', 'text/plain', 'application/octet-stream'],
    [FileType.PDF]: ['application/pdf']
  }
};

/**
 * Detecta o tipo de arquivo pela extensão
 */
function detectFileType(filename: string): FileType | null {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'csv': return FileType.CSV;
    case 'xlsx': 
    case 'xls': return FileType.XLSX;
    case 'ofx': return FileType.OFX;
    case 'pdf': return FileType.PDF;
    default: return null;
  }
}

/**
 * Valida se o arquivo está dentro das especificações
 */
function validateFile(file: File, fileType: FileType): string[] {
  const errors: string[] = [];
  
  // Validar tamanho
  if (file.size > FILE_VALIDATION.maxSize) {
    errors.push(`Arquivo muito grande. Máximo permitido: ${FILE_VALIDATION.maxSize / (1024 * 1024)}MB`);
  }
  
  // Validar MIME type
  const allowedTypes = FILE_VALIDATION.allowedMimeTypes[fileType];
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Tipo de arquivo não suportado. Esperado: ${allowedTypes.join(', ')}, recebido: ${file.type}`);
  }
  
  return errors;
}

/**
 * Normaliza string removendo acentos e convertendo para lowercase
 */
function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Encontra o índice da coluna baseado nos possíveis nomes
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(h => normalizeString(h));
  
  for (const name of possibleNames) {
    const normalizedName = normalizeString(name);
    const index = normalizedHeaders.indexOf(normalizedName);
    if (index !== -1) return index;
  }
  
  return -1;
}

/**
 * Analisa uma amostra de dados para detectar o tipo de cada coluna
 */
function analyzeColumnContent(data: any[], headers: string[]): {
  dateColumns: number[];
  valueColumns: number[];
  textColumns: number[];
} {
  const dateColumns: number[] = [];
  const valueColumns: number[] = [];
  const textColumns: number[] = [];
  
  // Analisa as primeiras 10 linhas ou todas se menos de 10
  const sampleSize = Math.min(10, data.length);
  
  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    let dateCount = 0;
    let valueCount = 0;
    let textCount = 0;
    let validSamples = 0;
    
    for (let rowIndex = 0; rowIndex < sampleSize; rowIndex++) {
      const cellValue = data[rowIndex][headers[colIndex]];
      
      if (cellValue === undefined || cellValue === null || cellValue === '') {
        continue;
      }
      
      validSamples++;
      const cellStr = cellValue.toString().trim();
      
      // Testa se é data
      if (isDateLike(cellStr)) {
        dateCount++;
      }
      // Testa se é valor monetário
      else if (isValueLike(cellStr)) {
        valueCount++;
      }
      // Testa se é texto descritivo
      else if (isTextLike(cellStr)) {
        textCount++;
      }
    }
    
    if (validSamples === 0) continue;
    
    // Define o tipo baseado na maioria (mais de 60%)
    const threshold = validSamples * 0.6;
    
    if (dateCount >= threshold) {
      dateColumns.push(colIndex);
    } else if (valueCount >= threshold) {
      valueColumns.push(colIndex);
    } else if (textCount >= threshold) {
      textColumns.push(colIndex);
    }
  }
  
  return { dateColumns, valueColumns, textColumns };
}

/**
 * Verifica se uma string parece ser uma data
 */
function isDateLike(str: string): boolean {
  // Formatos de data comuns
  const datePatterns = [
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // DD/MM/YYYY
    /^\d{1,2}-\d{1,2}-\d{4}$/, // DD-MM-YYYY
    /^\d{1,2}\.\d{1,2}\.\d{4}$/, // DD.MM.YYYY
    /^\d{4}-\d{1,2}-\d{1,2}$/, // YYYY-MM-DD
    /^\d{8}$/, // YYYYMMDD
  ];
  
  return datePatterns.some(pattern => pattern.test(str));
}

/**
 * Verifica se uma string parece ser um valor monetário
 */
function isValueLike(str: string): boolean {
  // Remove espaços e caracteres comuns de formatação
  const cleaned = str.replace(/[\s\$R]/g, '');
  
  // Padrões de valores monetários
  const valuePatterns = [
    /^-?\d+[\.,]\d{2}$/, // 123,45 ou 123.45
    /^-?\d{1,3}([\.,]\d{3})*([\.,]\d{2})?$/, // 1.234,56 ou 1,234.56
    /^-?\d+$/, // 123
    /^\(\d+[\.,]?\d*\)$/, // (123,45) - valor negativo
  ];
  
  return valuePatterns.some(pattern => pattern.test(cleaned));
}

/**
 * Verifica se uma string parece ser texto descritivo
 */
function isTextLike(str: string): boolean {
  // Texto com mais de 3 caracteres que não é data nem valor
  return str.length > 3 && !isDateLike(str) && !isValueLike(str) && /[a-zA-Z]/.test(str);
}

/**
 * Encontra colunas usando análise inteligente
 */
function findColumnsIntelligently(headers: string[], data: any[]): {
  dataCol: number;
  historicoCol: number;
  valorCol: number;
  documentoCol: number;
  saldoCol: number;
} {
  // Primeiro tenta pelo nome do header
  let dataCol = findColumnIndex(headers, DEFAULT_COLUMN_MAPPING.data);
  let historicoCol = findColumnIndex(headers, DEFAULT_COLUMN_MAPPING.historico);
  let valorCol = findColumnIndex(headers, DEFAULT_COLUMN_MAPPING.valor);
  let documentoCol = findColumnIndex(headers, DEFAULT_COLUMN_MAPPING.documento);
  let saldoCol = findColumnIndex(headers, DEFAULT_COLUMN_MAPPING.saldo);
  
  // Se não encontrou pelos nomes, usa análise de conteúdo
  if (dataCol === -1 || historicoCol === -1 || valorCol === -1) {
    const analysis = analyzeColumnContent(data, headers);
    
    // Atribui colunas baseado na análise
    if (dataCol === -1 && analysis.dateColumns.length > 0) {
      dataCol = analysis.dateColumns[0]; // Primeira coluna de data encontrada
    }
    
    if (historicoCol === -1 && analysis.textColumns.length > 0) {
      // Procura a coluna de texto mais longa (provavelmente o histórico)
      let bestTextCol = analysis.textColumns[0];
      let maxLength = 0;
      
      for (const colIndex of analysis.textColumns) {
        let totalLength = 0;
        for (let i = 0; i < Math.min(5, data.length); i++) {
          const cellValue = data[i][headers[colIndex]];
          if (cellValue) {
            totalLength += cellValue.toString().length;
          }
        }
        if (totalLength > maxLength) {
          maxLength = totalLength;
          bestTextCol = colIndex;
        }
      }
      historicoCol = bestTextCol;
    }
    
    if (valorCol === -1 && analysis.valueColumns.length > 0) {
      valorCol = analysis.valueColumns[0]; // Primeira coluna de valor encontrada
    }
  }
  
  return { dataCol, historicoCol, valorCol, documentoCol, saldoCol };
}

/**
 * Converte string de data para formato ISO (YYYY-MM-DD)
 */
function parseDate(dateStr: string): string {
  if (!dateStr) throw new Error('Data vazia');
  
  // Remove espaços e caracteres especiais
  const cleanDate = dateStr.trim().replace(/[^\d\/\-\.]/g, '');
  
  // Tenta diferentes formatos
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{4})(\d{2})(\d{2})$/, // YYYYMMDD
  ];
  
  for (let i = 0; i < formats.length; i++) {
    const match = cleanDate.match(formats[i]);
    if (match) {
      let year, month, day;
      
      if (i === 0) {
        // YYYY-MM-DD (já no formato correto)
        return cleanDate;
      } else if (i === 4) {
        // YYYYMMDD
        year = match[1];
        month = match[2];
        day = match[3];
      } else {
        // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
        day = match[1];
        month = match[2]; 
        year = match[3];
      }
      
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  throw new Error(`Formato de data não reconhecido: ${dateStr}`);
}

/**
 * Converte string de valor para número
 */
function parseValue(valueStr: string): number {
  if (!valueStr) return 0;
  
  // Remove espaços e caracteres não numéricos (exceto . , - +)
  const cleanValue = valueStr.toString().trim().replace(/[^\d\.\,\-\+]/g, '');
  
  if (!cleanValue) return 0;
  
  // Converte para formato padrão (ponto como decimal)
  let normalizedValue = cleanValue;
  
  // Se tem vírgula e ponto, vírgula é decimal
  if (normalizedValue.includes(',') && normalizedValue.includes('.')) {
    normalizedValue = normalizedValue.replace('.', '').replace(',', '.');
  }
  // Se tem apenas vírgula, troca por ponto
  else if (normalizedValue.includes(',')) {
    normalizedValue = normalizedValue.replace(',', '.');
  }
  
  const numValue = parseFloat(normalizedValue);
  
  if (isNaN(numValue)) {
    throw new Error(`Valor inválido: ${valueStr}`);
  }
  
  return numValue;
}

/**
 * Parser CSV usando papaparse
 */
async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const warnings: string[] = [];
          const transactions: RawTransaction[] = [];
          
          if (!results.data || results.data.length === 0) {
            throw new Error('Arquivo CSV vazio ou sem dados válidos');
          }
          
          // Pega os headers da primeira linha
          const headers = Object.keys(results.data[0] as Record<string, any>);
          
          // Encontra os índices das colunas usando análise inteligente
          const { dataCol, historicoCol, valorCol, documentoCol, saldoCol } = 
            findColumnsIntelligently(headers, results.data as any[]);
          
          if (dataCol === -1) {
            throw new Error('Coluna de data não encontrada. Headers disponíveis: ' + headers.join(', ') + 
              '. Verifique se o arquivo contém uma coluna com datas no formato DD/MM/YYYY ou similar.');
          }
          if (historicoCol === -1) {
            throw new Error('Coluna de histórico não encontrada. Headers disponíveis: ' + headers.join(', ') + 
              '. Verifique se o arquivo contém uma coluna com descrições das transações.');
          }
          if (valorCol === -1) {
            throw new Error('Coluna de valor não encontrada. Headers disponíveis: ' + headers.join(', ') + 
              '. Verifique se o arquivo contém uma coluna com valores monetários.');
          }
          
          let validRows = 0;
          let invalidRows = 0;
          
          // Processa cada linha
          for (let i = 0; i < results.data.length; i++) {
            const row = results.data[i] as Record<string, any>;
            
            try {
              const rawData = row[headers[dataCol]];
              const rawHistorico = row[headers[historicoCol]];
              const rawDocumento = documentoCol !== -1 ? row[headers[documentoCol]] : undefined;
              const rawValor = row[headers[valorCol]];
              const rawSaldo = saldoCol !== -1 ? row[headers[saldoCol]] : undefined;
              
              if (!rawData || !rawHistorico || rawValor === undefined || rawValor === '') {
                invalidRows++;
                warnings.push(`Linha ${i + 2}: Dados obrigatórios ausentes`);
                continue;
              }
              
              const transaction: RawTransaction = {
                data: parseDate(rawData),
                historico: rawHistorico.toString().trim(),
                documento: rawDocumento?.toString().trim() || undefined,
                valor: parseValue(rawValor),
                saldo: rawSaldo !== undefined && rawSaldo !== '' ? parseValue(rawSaldo) : undefined,
              };
              
              transactions.push(transaction);
              validRows++;
              
            } catch (error) {
              invalidRows++;
              warnings.push(`Linha ${i + 2}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            }
          }
          
          resolve({
            transactions,
            warnings,
            metadata: {
              fileType: FileType.CSV,
              totalRows: results.data.length,
              validRows,
              invalidRows
            }
          });
          
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`Erro ao processar CSV: ${error.message}`));
      }
    });
  });
}

/**
 * Parser XLSX usando xlsx
 */
async function parseXLSX(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Pega a primeira planilha
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('Nenhuma planilha encontrada no arquivo');
        }
        
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        if (!jsonData || jsonData.length === 0) {
          throw new Error('Planilha vazia ou sem dados válidos');
        }
        
        const warnings: string[] = [];
        const transactions: RawTransaction[] = [];
        
        // Pega os headers da primeira linha
        const headers = Object.keys(jsonData[0] as Record<string, any>);
        
        // Encontra os índices das colunas usando análise inteligente
        const { dataCol, historicoCol, valorCol, documentoCol, saldoCol } = 
          findColumnsIntelligently(headers, jsonData as any[]);
        
        if (dataCol === -1) {
          throw new Error('Coluna de data não encontrada. Headers disponíveis: ' + headers.join(', ') + 
            '. Verifique se o arquivo contém uma coluna com datas no formato DD/MM/YYYY ou similar.');
        }
        if (historicoCol === -1) {
          throw new Error('Coluna de histórico não encontrada. Headers disponíveis: ' + headers.join(', ') + 
            '. Verifique se o arquivo contém uma coluna com descrições das transações.');
        }
        if (valorCol === -1) {
          throw new Error('Coluna de valor não encontrada. Headers disponíveis: ' + headers.join(', ') + 
            '. Verifique se o arquivo contém uma coluna com valores monetários.');
        }
        
        let validRows = 0;
        let invalidRows = 0;
        
        // Processa cada linha
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as Record<string, any>;
          
          try {
            const rawData = row[headers[dataCol]];
            const rawHistorico = row[headers[historicoCol]];
            const rawDocumento = documentoCol !== -1 ? row[headers[documentoCol]] : undefined;
            const rawValor = row[headers[valorCol]];
            const rawSaldo = saldoCol !== -1 ? row[headers[saldoCol]] : undefined;
            
            if (!rawData || !rawHistorico || rawValor === undefined || rawValor === '') {
              invalidRows++;
              warnings.push(`Linha ${i + 2}: Dados obrigatórios ausentes`);
              continue;
            }
            
            const transaction: RawTransaction = {
              data: parseDate(rawData),
              historico: rawHistorico.toString().trim(),
              documento: rawDocumento?.toString().trim() || undefined,
              valor: parseValue(rawValor),
              saldo: rawSaldo !== undefined && rawSaldo !== '' ? parseValue(rawSaldo) : undefined,
            };
            
            transactions.push(transaction);
            validRows++;
            
          } catch (error) {
            invalidRows++;
            warnings.push(`Linha ${i + 2}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        }
        
        resolve({
          transactions,
          warnings,
          metadata: {
            fileType: FileType.XLSX,
            totalRows: jsonData.length,
            validRows,
            invalidRows
          }
        });
        
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo XLSX'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parser OFX básico (estrutura para futura implementação)
 */
async function parseOFX(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const warnings: string[] = ['Parser OFX em desenvolvimento - funcionalidade limitada'];
        const transactions: RawTransaction[] = [];
        
        // Implementação básica para extrair transações do OFX
        // Procura por tags <STMTTRN> que contêm as transações
        const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
        let match;
        let validRows = 0;
        let invalidRows = 0;
        
        while ((match = transactionRegex.exec(content)) !== null) {
          const transactionBlock = match[1];
          
          try {
            // Extrai campos da transação
            const dtPosted = transactionBlock.match(/<DTPOSTED>([^<]+)/)?.[1];
            const trnAmt = transactionBlock.match(/<TRNAMT>([^<]+)/)?.[1];
            const fitId = transactionBlock.match(/<FITID>([^<]+)/)?.[1];
            const name = transactionBlock.match(/<NAME>([^<]+)/)?.[1];
            const memo = transactionBlock.match(/<MEMO>([^<]+)/)?.[1];
            
            if (!dtPosted || !trnAmt) {
              invalidRows++;
              warnings.push(`Transação inválida: dados obrigatórios ausentes`);
              continue;
            }
            
            // Converte data do formato YYYYMMDD ou YYYYMMDDHHMMSS
            const dateStr = dtPosted.substring(0, 8);
            const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            
            const transaction: RawTransaction = {
              data: formattedDate,
              historico: name || memo || 'Transação OFX',
              documento: fitId || undefined,
              valor: parseValue(trnAmt),
              saldo: undefined // OFX geralmente não tem saldo por transação
            };
            
            transactions.push(transaction);
            validRows++;
            
          } catch (error) {
            invalidRows++;
            warnings.push(`Erro ao processar transação OFX: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        }
        
        if (transactions.length === 0) {
          warnings.push('Nenhuma transação encontrada no arquivo OFX');
        }
        
        resolve({
          transactions,
          warnings,
          metadata: {
            fileType: FileType.OFX,
            totalRows: validRows + invalidRows,
            validRows,
            invalidRows
          }
        });
        
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo OFX'));
    };
    
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Parser PDF usando pdfjs-dist (estrutura básica)
 */
async function parsePDF(file: File): Promise<ParseResult> {
  const warnings: string[] = ['Parser PDF em desenvolvimento - apenas extração de texto básica'];
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    
    if (pdf.numPages === 0) {
      throw new Error('PDF vazio');
    }
    
    // Processa apenas a primeira página
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    
    // Extrai todo o texto
    const fullText = textContent.items
      .filter((item): item is any => 'str' in item)
      .map((item: any) => item.str)
      .join(' ');
    
    // Por enquanto, apenas retorna estrutura básica
    // Futura implementação: detectar tabelas, extrair dados estruturados
    warnings.push('Texto extraído do PDF - funcionalidade de parsing em desenvolvimento');
    warnings.push(`Texto encontrado: ${fullText.substring(0, 200)}...`);
    
    return {
      transactions: [],
      warnings,
      metadata: {
        fileType: FileType.PDF,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0
      }
    };
    
  } catch (error) {
    throw new Error(`Erro ao processar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Função principal para parsing de arquivos
 */
export async function parseFile(file: File): Promise<ParseResult> {
  // Detecta o tipo de arquivo
  const fileType = detectFileType(file.name);
  if (!fileType) {
    throw new Error('Tipo de arquivo não suportado. Formatos aceitos: CSV, XLSX, OFX, PDF');
  }
  
  // Valida o arquivo
  const validationErrors = validateFile(file, fileType);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('; '));
  }
  
  // Chama o parser apropriado
  switch (fileType) {
    case FileType.CSV:
      return await parseCSV(file);
    
    case FileType.XLSX:
      return await parseXLSX(file);
    
    case FileType.OFX:
      return await parseOFX(file);
    
    case FileType.PDF:
      return await parsePDF(file);
    
    default:
      throw new Error(`Parser para ${fileType} não implementado`);
  }
}

/**
 * Utilitário para validar transações brutas
 */
export function validateRawTransactions(transactions: RawTransaction[]): {
  valid: RawTransaction[];
  invalid: Array<{ transaction: any; errors: string[] }>;
} {
  const valid: RawTransaction[] = [];
  const invalid: Array<{ transaction: any; errors: string[] }> = [];
  
  for (const transaction of transactions) {
    try {
      const validTransaction = rawTransactionSchema.parse(transaction);
      valid.push(validTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        invalid.push({
          transaction,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      } else {
        invalid.push({
          transaction,
          errors: ['Erro de validação desconhecido']
        });
      }
    }
  }
  
  return { valid, invalid };
}

/**
 * Utilitário para obter informações sobre formatos suportados
 */
export function getSupportedFormats(): Array<{
  type: FileType;
  extensions: string[];
  description: string;
  features: string[];
}> {
  return [
    {
      type: FileType.CSV,
      extensions: ['csv'],
      description: 'Arquivo de valores separados por vírgula',
      features: ['Auto-detecção de headers', 'Mapeamento automático de colunas', 'Suporte a diferentes formatos de data e valor']
    },
    {
      type: FileType.XLSX,
      extensions: ['xlsx', 'xls'],
      description: 'Planilha Excel',
      features: ['Processamento da primeira aba', 'Auto-detecção de headers', 'Mapeamento automático de colunas']
    },
    {
      type: FileType.OFX,
      extensions: ['ofx'],
      description: 'Open Financial Exchange',
      features: ['Extração básica de transações', 'Mapeamento de tags padrão', 'Em desenvolvimento']
    },
    {
      type: FileType.PDF,
      extensions: ['pdf'],
      description: 'Documento PDF',
      features: ['Extração de texto básica', 'Preparação para detecção de tabelas', 'Em desenvolvimento']
    }
  ];
}