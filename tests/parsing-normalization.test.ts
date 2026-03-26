import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

class TestFileReader {
  public onload: ((e: { target: { result: ArrayBuffer | string } }) => void) | null = null;
  public onerror: (() => void) | null = null;

  readAsArrayBuffer(file: File) {
    file.arrayBuffer()
      .then((result) => this.onload?.({ target: { result } }))
      .catch(() => this.onerror?.());
  }

  readAsText(file: File) {
    file.text()
      .then((result) => this.onload?.({ target: { result } }))
      .catch(() => this.onerror?.());
  }
}

(globalThis as any).FileReader = TestFileReader;
(globalThis as any).DOMMatrix = class DOMMatrix {};

const { parseFile, FileType } = await import('../client/src/lib/file-parsers');
const { normalizeTransactions } = await import('../client/src/lib/data-normalizer');

test('21) parseCSV gera transações válidas para normalização', async () => {
  const csv = [
    'data;historico;valor',
    '01/03/2026;PIX RECEBIDO PACIENTE;100,00',
    '02/03/2026;DARF FEDERAL;-40,00',
  ].join('\n');

  const file = new File([csv], 'extrato.csv', { type: 'text/csv' });
  const parsed = await parseFile(file);

  assert.equal(parsed.metadata.fileType, FileType.CSV);
  assert.equal(parsed.transactions.length, 2);

  const normalized = normalizeTransactions(parsed.transactions);
  assert.equal(normalized.transactions.length, 2);
  assert.equal(normalized.transactions[0].categoria, 'Receita');
  assert.equal(normalized.transactions[1].categoria, 'Despesa – Impostos');
});

test('22/24) parseXLSX + header detection continuam funcionando', async () => {
  const data = [
    ['Extrato Banco XYZ'],
    [],
    ['Data', 'Histórico', 'Valor'],
    ['03/03/2026', 'PAGAMENTO INTERNET', '-120,50'],
    ['04/03/2026', 'PIX RECEBIDO CLIENTE', '500,00'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plan1');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const file = new File([buffer], 'extrato.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const parsed = await parseFile(file);
  assert.equal(parsed.metadata.fileType, FileType.XLSX);
  assert.equal(parsed.transactions.length, 2);

  const normalized = normalizeTransactions(parsed.transactions);
  assert.equal(normalized.transactions[0].categoria, 'Despesa – Contas Fixas');
  assert.equal(normalized.transactions[1].categoria, 'Receita');
});

test('23/15/16/17) parser + normalizador preservam consistência numérica e operacional', async () => {
  const csv = [
    'data;historico;valor',
    '01/04/2026;PIX RECEBIDO A;100,00',
    '02/04/2026;PIX ENVIADO B;-30,00',
    '03/04/2026;RESGATE CONTAMAX;50,00',
  ].join('\n');

  const parsed = await parseFile(new File([csv], 'ok.csv', { type: 'text/csv' }));
  const normalized = normalizeTransactions(parsed.transactions);

  const bruto = parsed.transactions.reduce((s, t) => s + t.valor, 0);
  const processado = normalized.transactions.reduce((s, t) => s + t.valor, 0);
  const entradasBrutas = parsed.transactions.filter(t => t.valor > 0).reduce((s, t) => s + t.valor, 0);
  const receitasClassificadas = normalized.transactions
    .filter(t => t.categoria === 'Receita')
    .reduce((s, t) => s + t.valor, 0);

  assert.equal(Number(bruto.toFixed(2)), Number(processado.toFixed(2)));
  assert.equal(Number(entradasBrutas.toFixed(2)), Number((receitasClassificadas + 50).toFixed(2))); // +50 é não operacional

  for (const t of normalized.transactions) {
    if (t.categoria === 'Movimentação Não Operacional') {
      assert.equal(t.ehOperacional, false);
    }
  }
});

test('20) mês/ano predominante detectado corretamente', () => {
  const normalized = normalizeTransactions([
    { data: '2026-05-01', historico: 'PIX RECEBIDO', valor: 10 },
    { data: '2026-05-15', historico: 'DARF', valor: -2 },
    { data: '2026-04-20', historico: 'PIX ENVIADO', valor: -1 },
  ]);

  assert.equal(normalized.metadata.predominantMonth, '2026-05');
  assert.equal(normalized.metadata.predominantYear, 2026);
});

test('25) colunas inconsistentes falham de forma controlada', async () => {
  const csv = ['x;y;z', 'a;b;c'].join('\n');
  const file = new File([csv], 'bad.csv', { type: 'text/csv' });

  await assert.rejects(() => parseFile(file));
});

test('26) OFX e PDF têm comportamento explícito atual (parcial)', async () => {
  const ofx = '<OFX><STMTTRN><DTPOSTED>20260301120000</DTPOSTED><TRNAMT>-12.34</TRNAMT><NAME>TESTE</NAME></STMTTRN></OFX>';
  const ofxFile = new File([ofx], 'extrato.ofx', { type: 'application/x-ofx' });
  const ofxResult = await parseFile(ofxFile);
  assert.equal(ofxResult.metadata.fileType, FileType.OFX);
  assert.equal(ofxResult.transactions.length >= 1, true);

  const fakePdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'x.pdf', { type: 'application/pdf' });
  await assert.rejects(() => parseFile(fakePdf));
});
