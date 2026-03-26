import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTransactionCanonical,
  MACRO_CATEGORIES,
} from '../client/src/lib/classification-rules';

const allowed = new Set(Object.values(MACRO_CATEGORIES));

test('1) entrada positiva comum => Receita', () => {
  const result = classifyTransactionCanonical('PIX RECEBIDO CLIENTE', 1200);
  assert.equal(result.categoria, MACRO_CATEGORIES.RECEITA);
  assert.equal(result.ehOperacional, true);
});

test('2) entrada positiva não operacional => Movimentação Não Operacional', () => {
  const result = classifyTransactionCanonical('RESGATE CONTAMAX', 5000);
  assert.equal(result.categoria, MACRO_CATEGORIES.MOVIMENTACAO_NAO_OPERACIONAL);
  assert.equal(result.ehOperacional, false);
});

test('3) saída com DARF => Despesa – Impostos', () => {
  const result = classifyTransactionCanonical('PAGAMENTO DARF TRIBUTOS', -800);
  assert.equal(result.categoria, MACRO_CATEGORIES.IMPOSTOS);
});

test('4) saída com salário => Despesa – Folha de Pagamento', () => {
  const result = classifyTransactionCanonical('FOLHA DE PAGAMENTO FUNCIONARIOS', -3200);
  assert.equal(result.categoria, MACRO_CATEGORIES.FOLHA);
});

test('5) saída com energia/internet/aluguel => Despesa – Contas Fixas', () => {
  assert.equal(classifyTransactionCanonical('PAGAMENTO CONTA ENERGIA', -450).categoria, MACRO_CATEGORIES.CONTAS_FIXAS);
  assert.equal(classifyTransactionCanonical('MENSALIDADE INTERNET EMPRESA', -180).categoria, MACRO_CATEGORIES.CONTAS_FIXAS);
  assert.equal(classifyTransactionCanonical('ALUGUEL IMOVEL MATRIZ', -5000).categoria, MACRO_CATEGORIES.CONTAS_FIXAS);
});

test('6) saída com PIX enviado => PIX Enviado', () => {
  const result = classifyTransactionCanonical('PIX ENVIADO JOAO', -1000);
  assert.equal(result.categoria, MACRO_CATEGORIES.PIX_ENVIADO);
});

test('7) saída negativa genérica => Despesa – Boletos/Fornecedores', () => {
  const result = classifyTransactionCanonical('PAGAMENTO XYZ SEM REGRA', -77);
  assert.equal(result.categoria, MACRO_CATEGORIES.BOLETOS_FORNECEDORES);
});

test('8) transferências internas / contamax / aplicação / resgate => Movimentação Não Operacional', () => {
  const cases = [
    'TRANSFERENCIA ENTRE CONTAS DE: 3742.13.007880-5',
    'APLICACAO CONTAMAX',
    'RESGATE CONTAMAX',
    'AUTOMATICO CONTA INVESTIMENTO',
  ];

  for (const h of cases) {
    const result = classifyTransactionCanonical(h, -500);
    assert.equal(result.categoria, MACRO_CATEGORIES.MOVIMENTACAO_NAO_OPERACIONAL, h);
    assert.equal(result.ehOperacional, false, h);
  }
});

test('9) valor zero => Não Classificado (ou Não Operacional se regra financeira)', () => {
  assert.equal(classifyTransactionCanonical('LANCAMENTO SEM CONTEXTO', 0).categoria, MACRO_CATEGORIES.NAO_CLASSIFICADO);
  assert.equal(classifyTransactionCanonical('RESGATE CONTAMAX', 0).categoria, MACRO_CATEGORIES.MOVIMENTACAO_NAO_OPERACIONAL);
});

test('10) múltiplos sinais textuais respeitam prioridade oficial (imposto > boleto)', () => {
  const result = classifyTransactionCanonical('BOLETO DARF FEDERAL', -1200);
  assert.equal(result.categoria, MACRO_CATEGORIES.IMPOSTOS);
});

test('11) entrada positiva com palavra de despesa continua Receita (exceto não operacional)', () => {
  const result = classifyTransactionCanonical('DARF ESTORNO CREDITO', 210);
  assert.equal(result.categoria, MACRO_CATEGORIES.RECEITA);
});

test('12) 100% das categorias finais pertencem ao conjunto macro oficial', () => {
  const samples = [
    ['PIX RECEBIDO', 10],
    ['RESGATE CONTAMAX', 10],
    ['DARF', -1],
    ['SALARIO', -1],
    ['INTERNET', -1],
    ['PIX ENVIADO', -1],
    ['PAGAMENTO GENÉRICO', -1],
    ['SEM SINAL', 0],
  ] as const;

  for (const [historico, valor] of samples) {
    const { categoria } = classifyTransactionCanonical(historico, valor);
    assert.equal(allowed.has(categoria), true, `${historico} => ${categoria}`);
  }
});
