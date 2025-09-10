/**
 * Arquivo temporário para executar testes completos do sistema avançado de classificação
 */

import { 
  runAllTests,
  classifyTransactionAdvanced,
  createSampleDictionaries,
  detectFinancialMovement,
  detectTax,
  detectSalaryByHeuristic,
  checkEmployeeList,
  checkSupplierList,
  type AdvancedClassificationResult
} from './classification-rules';

import {
  generateEnhancedOperationalSummary,
  annotateTransactions
} from './report-generators';

import { type ClassifiedTransaction } from '@shared/schema';

/**
 * Executa todos os casos de teste obrigatórios conforme especificação
 */
function runMandatoryTestCases(): void {
  console.log("\n=== CASOS DE TESTE OBRIGATÓRIOS ===");
  
  const sampleDicts = createSampleDictionaries();
  const testCases = [
    {
      nome: "1. DARF TRIBUTOS FEDERAIS → Imposto",
      historico: "DARF TRIBUTOS FEDERAIS",
      valor: -2500,
      data: "2024-09-10",
      expectativa: "Imposto"
    },
    {
      nome: "2. Município de Ribeirão Preto → Imposto",
      historico: "Município de Ribeirão Preto (boleto)",
      valor: -1800,
      data: "2024-09-15", 
      expectativa: "Imposto"
    },
    {
      nome: "3. PIX para pessoa física → Salário (heurístico)",
      historico: "PIX ENVIADO FULANO SILVA",
      valor: -3200,
      data: "2024-08-04",
      expectativa: "Salário (heurístico)"
    },
    {
      nome: "4. RESGATE CONTAMAX → Mov. Financeira (não operacional)",
      historico: "RESGATE CONTAMAX",
      valor: -5000,
      data: "2024-09-12",
      expectativa: "Movimentação Financeira (não operacional)"
    },
    {
      nome: "5. Transferência entre contas → Mov. Financeira (não operacional)", 
      historico: "TRANSFERÊNCIA ENTRE CONTAS DE: 3742.13.007880-5",
      valor: -2000,
      data: "2024-09-08",
      expectativa: "Movimentação Financeira (não operacional)"
    },
    {
      nome: "6. Casa das Ceras LTDA → Fornecedor (não imposto)",
      historico: "Casa das Ceras LTDA", 
      valor: -850,
      data: "2024-09-05",
      expectativa: "Outros" // ou "PIX Enviado" dependendo da implementação
    }
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  testCases.forEach((testCase, index) => {
    console.log(`\n${testCase.nome}:`);
    console.log(`Histórico: "${testCase.historico}"`);
    console.log(`Valor: ${testCase.valor}, Data: ${testCase.data}`);
    
    const resultado = classifyTransactionAdvanced(
      testCase.historico,
      testCase.valor,
      testCase.data,
      sampleDicts.funcionarios,
      sampleDicts.fornecedores
    );
    
    console.log(`Resultado: ${resultado.classificacaoFinal}`);
    console.log(`Categoria: ${resultado.categoria}`);
    console.log(`É Operacional: ${resultado.ehOperacional}`);
    console.log(`Confidence Score: ${(resultado.confidenceScore * 100).toFixed(1)}%`);
    
    // Verificação específica por caso
    let passed = false;
    switch (index) {
      case 0: // DARF
        passed = resultado.ehImposto && resultado.categoria === "Despesa – Impostos";
        break;
      case 1: // Município
        passed = resultado.ehImposto && resultado.categoria === "Despesa – Impostos";
        break;
      case 2: // PIX heurístico
        passed = resultado.ehSalarioHeuristico && resultado.needsReview;
        break;
      case 3: // RESGATE
        passed = resultado.ehMovtoFinanceiro && !resultado.ehOperacional;
        break;
      case 4: // Transferência
        passed = resultado.ehMovtoFinanceiro && !resultado.ehOperacional;
        break;
      case 5: // Casa das Ceras
        passed = !resultado.ehImposto; // Principal: não deve ser classificado como imposto
        break;
    }
    
    if (passed) {
      console.log("✅ PASSOU");
      totalPassed++;
    } else {
      console.log("❌ FALHOU");
      console.log(`  Expectativa: ${testCase.expectativa}`);
      console.log(`  Obtido: ${resultado.classificacaoFinal}`);
      totalFailed++;
    }
  });

  console.log(`\n=== RESUMO CASOS OBRIGATÓRIOS ===`);
  console.log(`✅ Passed: ${totalPassed}/${testCases.length}`);
  console.log(`❌ Failed: ${totalFailed}/${testCases.length}`);
  console.log(`Success Rate: ${((totalPassed / testCases.length) * 100).toFixed(1)}%`);
}

/**
 * Testa geração de relatórios aprimorados
 */
function testEnhancedReports(): void {
  console.log("\n=== TESTE DE RELATÓRIOS APRIMORADOS ===");
  
  // Cria dados de teste com diferentes tipos de transações
  const testTransactions: ClassifiedTransaction[] = [
    // Receitas
    { dateISO: "2024-09-01", historico: "PIX RECEBIDO UNIMED", valor: 1500, categoria: "Receita – PIX/Outros Recebimentos", ehOperacional: true, mes: 9, ano: 2024, isoWeek: 35 },
    { dateISO: "2024-09-02", historico: "PIX RECEBIDO AMIL", valor: 2300, categoria: "Receita – PIX/Outros Recebimentos", ehOperacional: true, mes: 9, ano: 2024, isoWeek: 35 },
    
    // Salários  
    { dateISO: "2024-09-05", historico: "FOLHA DE PAGAMENTO", valor: -8000, categoria: "Despesa – Folha de Pagamento", ehOperacional: true, mes: 9, ano: 2024, isoWeek: 36 },
    { dateISO: "2024-09-05", historico: "PIX ENVIADO MARIA SILVA", valor: -3200, categoria: "Despesa – Folha de Pagamento", ehOperacional: true, mes: 9, ano: 2024, isoWeek: 36 },
    
    // Impostos
    { dateISO: "2024-09-10", historico: "DARF IRPJ", valor: -2500, categoria: "Despesa – Impostos", ehOperacional: true, mes: 9, ano: 2024, isoWeek: 37 },
    { dateISO: "2024-09-15", historico: "MUNICIPIO ISS", valor: -1200, categoria: "Despesa – Impostos", ehOperacional: true, mes: 9, ano: 2024, isoWeek: 37 },
    
    // Movimentações financeiras (não operacionais)
    { dateISO: "2024-09-08", historico: "RESGATE CONTAMAX", valor: -10000, categoria: "Movimentação Financeira – não operacional", ehOperacional: false, mes: 9, ano: 2024, isoWeek: 36 },
    { dateISO: "2024-09-12", historico: "APLICACAO FUNDO", valor: 8000, categoria: "Movimentação Financeira – não operacional", ehOperacional: false, mes: 9, ano: 2024, isoWeek: 37 },
    
    // Fornecedores
    { dateISO: "2024-09-03", historico: "BOLETO ENERGIA", valor: -450, categoria: "Despesa – Contas Fixas", ehOperacional: true, mes: 9, ano: 2024, isoWeek: 35 },
    { dateISO: "2024-09-07", historico: "PIX ENVIADO FORNECEDOR LTDA", valor: -1800, categoria: "Despesa – PIX Enviado", ehOperacional: true, mes: 9, ano: 2024, isoWeek: 36 }
  ];

  try {
    const enhancedSummary = generateEnhancedOperationalSummary(testTransactions);
    
    console.log("Resumo Operacional Aprimorado:");
    console.log(`- Entradas: R$ ${enhancedSummary.entradasReais.toFixed(2)}`);
    console.log(`- Saídas: R$ ${enhancedSummary.saidasReais.toFixed(2)}`);
    console.log(`- Saldo: R$ ${enhancedSummary.saldoLiquido.toFixed(2)}`);
    
    console.log("\nTotais Categorizados:");
    console.log(`- Impostos: R$ ${enhancedSummary.impostos.total.toFixed(2)} (${enhancedSummary.impostos.lista.length} transações)`);
    console.log(`- Salários Confirmados: R$ ${enhancedSummary.salariosConfirmados.total.toFixed(2)} (${enhancedSummary.salariosConfirmados.lista.length} transações)`);
    console.log(`- Salários Heurísticos: R$ ${enhancedSummary.salariosHeuristicos.total.toFixed(2)} (${enhancedSummary.salariosHeuristicos.lista.length} transações)`);
    console.log(`- Mov. Financeiras: R$ ${enhancedSummary.movimentacoesFinanceiras.total.toFixed(2)} (${enhancedSummary.movimentacoesFinanceiras.lista.length} transações)`);
    
    console.log(`\nFila de Revisão: ${enhancedSummary.filaRevisao.length} items`);
    enhancedSummary.filaRevisao.forEach((item, i) => {
      console.log(`${i + 1}. ${item.motivo} - R$ ${item.valor.toFixed(2)}`);
    });
    
    // Validações
    const expectedReceitas = 1500 + 2300;  // 3800
    const expectedDespesas = 8000 + 3200 + 2500 + 1200 + 450 + 1800;  // 17150
    const expectedSaldo = expectedReceitas - expectedDespesas;  // -13350
    
    console.log(`\n=== VALIDAÇÕES ===`);
    console.log(`Entradas esperadas: R$ ${expectedReceitas}, obtidas: R$ ${enhancedSummary.entradasReais}`);
    console.log(`Saídas esperadas: R$ ${expectedDespesas}, obtidas: R$ ${enhancedSummary.saidasReais}`);
    console.log(`Saldo esperado: R$ ${expectedSaldo}, obtido: R$ ${enhancedSummary.saldoLiquido}`);
    
    const validacao1 = Math.abs(enhancedSummary.entradasReais - expectedReceitas) < 0.01;
    const validacao2 = Math.abs(enhancedSummary.saidasReais - expectedDespesas) < 0.01;
    const validacao3 = Math.abs(enhancedSummary.saldoLiquido - expectedSaldo) < 0.01;
    
    console.log(validacao1 ? "✅ Entradas corretas" : "❌ Erro nas entradas");
    console.log(validacao2 ? "✅ Saídas corretas" : "❌ Erro nas saídas");  
    console.log(validacao3 ? "✅ Saldo correto" : "❌ Erro no saldo");
    
  } catch (error) {
    console.log("❌ Erro ao gerar relatório aprimorado:", error);
  }
}

/**
 * Testa sistema de dicionários (listas de funcionários e fornecedores)
 */
function testDictionarySystem(): void {
  console.log("\n=== TESTE DE SISTEMA DE DICIONÁRIOS ===");
  
  const funcionarios = ["João Silva Santos", "Maria Oliveira Costa", "Carlos Alberto Souza"];
  const fornecedores = ["MEDICA LTDA", "FARMACIA CENTRAL", "MATERIAL HOSPITALAR SA"];
  
  const testCases = [
    {
      nome: "Funcionário conhecido - deve ser salário confirmado",
      historico: "PIX ENVIADO JOÃO SILVA SANTOS",
      valor: -3200,
      data: "2024-09-05"
    },
    {
      nome: "Fornecedor conhecido - deve ser fornecedor confirmado", 
      historico: "PIX ENVIADO MEDICA LTDA EQUIPAMENTOS",
      valor: -1200,
      data: "2024-09-10"
    },
    {
      nome: "PIX para desconhecido em data de pagamento - deve ser heurístico",
      historico: "PIX ENVIADO FULANO SILVA TESTE",
      valor: -2800,
      data: "2024-09-05"
    }
  ];
  
  testCases.forEach(testCase => {
    console.log(`\n${testCase.nome}:`);
    
    const resultado = classifyTransactionAdvanced(
      testCase.historico,
      testCase.valor,
      testCase.data,
      funcionarios,
      fornecedores
    );
    
    console.log(`Histórico: "${testCase.historico}"`);
    console.log(`Resultado: ${resultado.classificacaoFinal}`);
    console.log(`Salário Confirmado: ${resultado.salarioConfirmado}`);
    console.log(`Needs Review: ${resultado.needsReview}`);
    
    // Validações específicas
    if (testCase.nome.includes("Funcionário conhecido")) {
      console.log(resultado.salarioConfirmado ? "✅ PASSOU" : "❌ FALHOU");
    } else if (testCase.nome.includes("Fornecedor conhecido")) {
      console.log(resultado.classificacaoFinal.includes("Fornecedor") ? "✅ PASSOU" : "❌ FALHOU");
    } else if (testCase.nome.includes("heurístico")) {
      console.log((resultado.ehSalarioHeuristico && resultado.needsReview) ? "✅ PASSOU" : "❌ FALHOU");
    }
  });
}

/**
 * Executa todos os testes
 */
function runComprehensiveTests(): void {
  console.log("🧪 INICIANDO TESTES COMPLETOS DO SISTEMA AVANÇADO DE CLASSIFICAÇÃO");
  console.log("=" .repeat(80));
  
  try {
    // 1. Testes básicos implementados
    console.log("\n1. EXECUTANDO TESTES BÁSICOS IMPLEMENTADOS:");
    runAllTests();
    
    // 2. Casos obrigatórios
    console.log("\n2. EXECUTANDO CASOS OBRIGATÓRIOS:");
    runMandatoryTestCases();
    
    // 3. Relatórios aprimorados
    console.log("\n3. TESTANDO RELATÓRIOS APRIMORADOS:");
    testEnhancedReports();
    
    // 4. Sistema de dicionários
    console.log("\n4. TESTANDO SISTEMA DE DICIONÁRIOS:");
    testDictionarySystem();
    
    console.log("\n" + "=" .repeat(80));
    console.log("✅ TESTES COMPLETOS EXECUTADOS COM SUCESSO!");
    
  } catch (error) {
    console.error("\n❌ ERRO DURANTE EXECUÇÃO DOS TESTES:", error);
  }
}

// Executa os testes
runComprehensiveTests();