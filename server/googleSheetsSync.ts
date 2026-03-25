import { getUncachableGoogleSheetClient, getUncachableDriveClient } from './googleSheets';
import { db } from './db';
import { bankTransactions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_ID_FILE = path.join(process.cwd(), '.google-sheet-id');
const SPREADSHEET_NAME = 'Clínica Basile — Extrato por Mês';

const MONTH_NAMES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

function getSheetName(mes: number, ano: number): string {
  return `${MONTH_NAMES[mes]} ${ano}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getOrCreateSpreadsheetId(): string | null {
  if (fs.existsSync(SPREADSHEET_ID_FILE)) {
    return fs.readFileSync(SPREADSHEET_ID_FILE, 'utf-8').trim();
  }
  return null;
}

function saveSpreadsheetId(id: string) {
  fs.writeFileSync(SPREADSHEET_ID_FILE, id, 'utf-8');
}

async function ensureSpreadsheet(): Promise<string> {
  const existingId = getOrCreateSpreadsheetId();

  if (existingId) {
    // Verify it still exists
    try {
      const sheets = await getUncachableGoogleSheetClient();
      await sheets.spreadsheets.get({ spreadsheetId: existingId });
      return existingId;
    } catch {
      // If not found, create a new one
    }
  }

  const sheets = await getUncachableGoogleSheetClient();
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: SPREADSHEET_NAME },
      sheets: [
        { properties: { title: 'Comparativo Mensal', index: 0 } },
      ],
    },
  });

  const id = response.data.spreadsheetId!;
  saveSpreadsheetId(id);
  return id;
}

interface Transaction {
  id: string;
  dateISO: string;
  historico: string;
  documento: string | null;
  valor: string;
  saldo: string | null;
  categoria: string;
  ehOperacional: number;
  mes: number;
  ano: number;
}

async function getTransactionsForMonth(mes: number, ano: number): Promise<Transaction[]> {
  const results = await db
    .select()
    .from(bankTransactions)
    .where(and(eq(bankTransactions.mes, mes), eq(bankTransactions.ano, ano)))
    .orderBy(bankTransactions.dateISO, bankTransactions.categoria);

  return results as Transaction[];
}

async function getAvailableMonths(): Promise<Array<{ mes: number; ano: number }>> {
  const results = await db
    .selectDistinct({ mes: bankTransactions.mes, ano: bankTransactions.ano })
    .from(bankTransactions)
    .orderBy(bankTransactions.ano, bankTransactions.mes);

  return results;
}

function buildMonthlySheetData(
  mes: number,
  ano: number,
  transactions: Transaction[]
): any[][] {
  const monthName = getSheetName(mes, ano);

  // Group by category
  const byCategory = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const cat = t.categoria || 'Sem Categoria';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(t);
  }

  // Compute totals
  const totalSaidas = transactions
    .filter((t) => parseFloat(t.valor) < 0)
    .reduce((sum, t) => sum + parseFloat(t.valor), 0);
  const totalEntradas = transactions
    .filter((t) => parseFloat(t.valor) > 0)
    .reduce((sum, t) => sum + parseFloat(t.valor), 0);

  const rows: any[][] = [];

  // Title row
  rows.push([`Clínica Basile — ${monthName}`]);
  // Summary row
  rows.push([
    `Total Saídas: ${formatCurrency(Math.abs(totalSaidas))}`,
    null,
    `Total Entradas: ${formatCurrency(totalEntradas)}`,
    null,
    `Lançamentos: ${transactions.length}`,
  ]);
  rows.push([]); // blank

  // Sort categories
  const sortedCategories = Array.from(byCategory.keys()).sort();

  for (const cat of sortedCategories) {
    const items = byCategory.get(cat)!;
    const subtotal = items.reduce((sum, t) => sum + parseFloat(t.valor), 0);

    // Category header
    rows.push([`  ▸  ${cat}`]);
    rows.push(['Data', 'Histórico', 'Documento', 'Valor (R$)', 'Saldo (R$)', '']);

    for (const t of items) {
      rows.push([
        t.dateISO,
        t.historico,
        t.documento || '',
        parseFloat(t.valor),
        t.saldo ? parseFloat(t.saldo) : '',
        '',
      ]);
    }

    // Subtotal
    rows.push([null, null, 'Subtotal', subtotal]);
    rows.push([]); // blank
  }

  return rows;
}

function buildComparativoData(
  months: Array<{ mes: number; ano: number }>,
  allTransactions: Map<string, Transaction[]>
): any[][] {
  // Collect all categories
  const allCategories = new Set<string>();
  for (const transactions of allTransactions.values()) {
    for (const t of transactions) {
      allCategories.add(t.categoria || 'Sem Categoria');
    }
  }

  const sortedCategories = Array.from(allCategories).sort();
  const monthLabels = months.map((m) => getSheetName(m.mes, m.ano));

  const rows: any[][] = [];

  // Title
  rows.push([`Clínica Basile — Comparativo de Gastos por Categoria e Mês`]);

  // Header row
  rows.push(['Categoria', ...monthLabels, 'TOTAL']);

  // Category rows
  for (const cat of sortedCategories) {
    const monthValues = months.map((m) => {
      const key = `${m.mes}-${m.ano}`;
      const txs = allTransactions.get(key) || [];
      const total = txs
        .filter((t) => (t.categoria || 'Sem Categoria') === cat)
        .reduce((sum, t) => sum + parseFloat(t.valor), 0);
      return total === 0 ? null : total;
    });

    const rowTotal = monthValues.reduce((sum: number, v) => sum + (v || 0), 0);

    rows.push([cat, ...monthValues, rowTotal === 0 ? null : rowTotal]);
  }

  // Total row
  const totalRow = ['TOTAL GERAL'];
  for (const m of months) {
    const key = `${m.mes}-${m.ano}`;
    const txs = allTransactions.get(key) || [];
    const total = txs.reduce((sum, t) => sum + parseFloat(t.valor), 0);
    totalRow.push(total as any);
  }
  const grandTotal = Array.from(allTransactions.values())
    .flat()
    .reduce((sum, t) => sum + parseFloat(t.valor), 0);
  totalRow.push(grandTotal as any);
  rows.push(totalRow);

  return rows;
}

async function ensureSheetExists(
  spreadsheetId: string,
  sheetTitle: string,
  existingSheets: string[]
): Promise<void> {
  if (existingSheets.includes(sheetTitle)) return;

  const sheets = await getUncachableGoogleSheetClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title: sheetTitle },
          },
        },
      ],
    },
  });
}

async function writeSheetData(
  spreadsheetId: string,
  sheetTitle: string,
  data: any[][]
): Promise<void> {
  const sheets = await getUncachableGoogleSheetClient();

  // Clear the sheet first
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetTitle}'`,
  });

  if (data.length === 0) return;

  // Write new data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetTitle}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: data.map((row) =>
        row.map((cell) => {
          if (cell === null || cell === undefined) return '';
          if (typeof cell === 'number') return cell;
          return String(cell);
        })
      ),
    },
  });
}

async function formatSheets(
  spreadsheetId: string,
  sheetDataMap: Map<string, { sheetId: number; title: string; isMonthly: boolean }>
): Promise<void> {
  const sheets = await getUncachableGoogleSheetClient();

  const requests: any[] = [];

  for (const [, info] of sheetDataMap) {
    const { sheetId } = info;

    if (info.isMonthly) {
      // Bold title row
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 13 }, backgroundColor: { red: 0.2, green: 0.4, blue: 0.7 } } },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        },
      });
      // Bold summary row
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 2 },
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat(textFormat)',
        },
      });
    } else {
      // Comparativo: bold header and last row
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 2 },
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat(textFormat)',
        },
      });
    }

    // Auto-resize all columns
    requests.push({
      autoResizeDimensions: {
        dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 10 },
      },
    });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }
}

export async function syncToGoogleSheets(): Promise<{ url: string; sheetsUpdated: number }> {
  const spreadsheetId = await ensureSpreadsheet();
  const months = await getAvailableMonths();

  if (months.length === 0) {
    throw new Error('Nenhum dado de extrato encontrado no banco de dados.');
  }

  // Load all transactions
  const allTransactions = new Map<string, Transaction[]>();
  for (const { mes, ano } of months) {
    const txs = await getTransactionsForMonth(mes, ano);
    allTransactions.set(`${mes}-${ano}`, txs);
  }

  // Get current sheet structure
  const sheetsClient = await getUncachableGoogleSheetClient();
  const spreadsheetInfo = await sheetsClient.spreadsheets.get({ spreadsheetId });
  const existingSheets = (spreadsheetInfo.data.sheets || []).map(
    (s) => s.properties?.title || ''
  );

  const sheetIdMap = new Map<string, number>();
  for (const s of spreadsheetInfo.data.sheets || []) {
    sheetIdMap.set(s.properties?.title || '', s.properties?.sheetId || 0);
  }

  // Ensure all monthly sheets exist
  const requiredSheets = ['Comparativo Mensal', ...months.map((m) => getSheetName(m.mes, m.ano))];

  for (const title of requiredSheets) {
    await ensureSheetExists(spreadsheetId, title, existingSheets);
  }

  // Reload sheet IDs after potential creation
  const updatedInfo = await sheetsClient.spreadsheets.get({ spreadsheetId });
  const updatedSheetIdMap = new Map<string, number>();
  for (const s of updatedInfo.data.sheets || []) {
    updatedSheetIdMap.set(s.properties?.title || '', s.properties?.sheetId || 0);
  }

  // Write Comparativo Mensal
  const comparativoData = buildComparativoData(months, allTransactions);
  await writeSheetData(spreadsheetId, 'Comparativo Mensal', comparativoData);

  // Write each monthly sheet
  let sheetsUpdated = 1; // comparativo
  for (const { mes, ano } of months) {
    const title = getSheetName(mes, ano);
    const txs = allTransactions.get(`${mes}-${ano}`) || [];
    const data = buildMonthlySheetData(mes, ano, txs);
    await writeSheetData(spreadsheetId, title, data);
    sheetsUpdated++;
  }

  // Apply formatting
  const sheetFormatMap = new Map<string, { sheetId: number; title: string; isMonthly: boolean }>();
  for (const [title, sheetId] of updatedSheetIdMap) {
    sheetFormatMap.set(title, {
      sheetId,
      title,
      isMonthly: title !== 'Comparativo Mensal',
    });
  }
  await formatSheets(spreadsheetId, sheetFormatMap);

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  return { url, sheetsUpdated };
}

export function getSpreadsheetUrl(): string | null {
  const id = getOrCreateSpreadsheetId();
  return id ? `https://docs.google.com/spreadsheets/d/${id}` : null;
}
