import test from 'node:test';
import assert from 'node:assert/strict';

import { annotateTransactions, generateCategoryReport, generateOperationalSummary } from '../client/src/lib/report-generators';
import { classifyTransactionAdvanced } from '../client/src/lib/classification-rules';
import type { ClassifiedTransaction } from '../shared/schema';

const sample: ClassifiedTransaction[] = [
  {
    dateISO: '2026-03-01', historico: 'PIX RECEBIDO A', documento: '1', valor: 100,
    saldo: 100, categoria: 'Receita', ehOperacional: true, mes: 3, ano: 2026, isoWeek: 9,
  },
  {
    dateISO: '2026-03-02', historico: 'DARF FEDERAL', documento: '2', valor: -20,
    saldo: 80, categoria: 'Despesa – Impostos', ehOperacional: true, mes: 3, ano: 2026, isoWeek: 9,
  },
];

test('29) annotateTransactions não sobrescreve categoria final', () => {
  const annotated = annotateTransactions(sample, [], [], []);
  assert.equal(annotated[0].categoria, sample[0].categoria);
  assert.equal(annotated[1].categoria, sample[1].categoria);
});

test('35) learned_classifications não sobrescreve categoria persistida no advanced', () => {
  const result = classifyTransactionAdvanced(
    'DARF FEDERAL',
    -20,
    '2026-03-02',
    [],
    [],
    [{
      id: 'l1',
      historico: 'DARF FEDERAL',
      categoria: 'Receita',
      classificacaoFinal: 'Receita',
      ehOperacional: 1,
      dataAprendizado: '2026-03-10',
      vezesAplicado: 1,
      createdAt: null,
      updatedAt: null,
    }]
  );

  assert.equal(result.categoria, 'Despesa – Impostos');
});

test('30/32) consolidação por relatório mantém categoria e totais coerentes', () => {
  const summary = generateOperationalSummary(sample);
  const categories = generateCategoryReport(sample);

  assert.equal(summary.entradasReais, 100);
  assert.equal(summary.saidasReais, 20);
  assert.equal(summary.saldoLiquido, 80);

  const receita = categories.find(c => c.categoria === 'Receita');
  const impostos = categories.find(c => c.categoria === 'Despesa – Impostos');
  assert.equal(receita?.valor, 100);
  assert.equal(impostos?.valor, -20);
});
