import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTransactionAnalytical,
  ANALYTICAL_EXPENSE_CATEGORIES,
} from '../client/src/lib/classification-rules';

test('PIX para funcionário => Folha de Pagamento / RH', () => {
  const result = classifyTransactionAnalytical('PIX ENVIADO MARCELLA CAVINATTO SALIBE', -3500);
  assert.equal(result.categoriaAnaliticaFinal, ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH);
  assert.equal(result.categoriaMacro, 'Despesa – Folha de Pagamento');
  assert.equal(result.requiresReview, false);
});

test('PIX para anestesista => Serviço de Anestesia', () => {
  const result = classifyTransactionAnalytical('PIX ENVIADO JULIA GARCIA SILVESTRE', -1800);
  assert.equal(result.categoriaAnaliticaFinal, ANALYTICAL_EXPENSE_CATEGORIES.SERVICO_ANESTESIA);
  assert.equal(result.categoriaMacro, 'Despesa – Boletos/Fornecedores');
  assert.equal(result.requiresReview, false);
});

test('PIX para manutenção => Manutenção', () => {
  const result = classifyTransactionAnalytical('PIX ENVIADO JULIANO MARQUES LEONI', -900);
  assert.equal(result.categoriaAnaliticaFinal, ANALYTICAL_EXPENSE_CATEGORIES.MANUTENCAO);
  assert.equal(result.categoriaMacro, 'Despesa – Boletos/Fornecedores');
  assert.equal(result.requiresReview, false);
});

test('PIX para conta própria => Transferências Internas', () => {
  const result = classifyTransactionAnalytical('PIX ENVIADO CLINICA BASILE LTDA', -5000);
  assert.equal(result.categoriaAnaliticaFinal, ANALYTICAL_EXPENSE_CATEGORIES.TRANSFERENCIAS_INTERNAS);
  assert.equal(result.categoriaMacro, 'Movimentação Não Operacional');
  assert.equal(result.ehOperacional, false);
  assert.equal(result.requiresReview, false);
});

test('PIX para contabilidade => Contabilidade / Assessoria', () => {
  const result = classifyTransactionAnalytical('PIX ENVIADO CESAR CONTABILIDADE LTDA', -1200);
  assert.equal(result.categoriaAnaliticaFinal, ANALYTICAL_EXPENSE_CATEGORIES.CONTABILIDADE_ASSESSORIA);
  assert.equal(result.categoriaMacro, 'Despesa – Boletos/Fornecedores');
  assert.equal(result.requiresReview, false);
});

test('PIX sem match => PIX Enviado – Outros Fornecedores + revisão', () => {
  const result = classifyTransactionAnalytical('PIX ENVIADO FORNECEDOR NOVO XYZ', -760);
  assert.equal(result.categoriaAnaliticaFinal, ANALYTICAL_EXPENSE_CATEGORIES.PIX_OUTROS_FORNECEDORES);
  assert.equal(result.categoriaMacro, 'PIX Enviado');
  assert.equal(result.requiresReview, true);
  assert.equal(result.regraAplicada, 'pix_no_counterparty_match');
});
