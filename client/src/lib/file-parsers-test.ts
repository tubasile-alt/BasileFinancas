/**
 * Testes básicos para validar o sistema de parsers de arquivos bancários
 * Este arquivo pode ser usado para verificar se todos os parsers estão funcionando corretamente
 */

import { parseFile, validateRawTransactions, getSupportedFormats, RawTransaction } from './file-parsers';

/**
 * Cria um arquivo de teste CSV simulado
 */
export function createTestCSVFile(): File {
  const csvContent = `Data,Historico,Documento,Valor,Saldo
01/01/2024,PIX RECEBIDO - FULANO,123456,1500.00,5000.00
02/01/2024,BOLETO PAGO - ENERGIA,789012,-250.75,4749.25
03/01/2024,TRANSFERENCIA RECEBIDA,345678,800.50,5549.75`;

  const blob = new Blob([csvContent], { type: 'text/csv' });
  return new File([blob], 'extrato-teste.csv', { type: 'text/csv' });
}

/**
 * Cria dados de teste para validar transações
 */
export function createTestTransactions(): RawTransaction[] {
  return [
    {
      data: '2024-01-01',
      historico: 'PIX RECEBIDO - CLIENTE TESTE',
      documento: '123456',
      valor: 1500.00,
      saldo: 5000.00
    },
    {
      data: '2024-01-02',
      historico: 'BOLETO PAGO - ENERGIA ELÉTRICA',
      documento: '789012',
      valor: -250.75,
      saldo: 4749.25
    },
    {
      data: '2024-01-03',
      historico: 'TRANSFERÊNCIA TED RECEBIDA',
      valor: 800.50,
      saldo: 5549.75
    }
  ];
}

/**
 * Testa o parser CSV
 */
export async function testCSVParser(): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    const testFile = createTestCSVFile();
    const result = await parseFile(testFile);
    
    if (result.transactions.length === 0) {
      return {
        success: false,
        message: 'Parser CSV não retornou transações'
      };
    }
    
    if (result.metadata.fileType !== 'csv') {
      return {
        success: false,
        message: 'Tipo de arquivo não foi detectado corretamente'
      };
    }
    
    // Verifica se as transações têm os campos necessários
    const firstTransaction = result.transactions[0];
    if (!firstTransaction.data || !firstTransaction.historico || firstTransaction.valor === undefined) {
      return {
        success: false,
        message: 'Transação não possui campos obrigatórios'
      };
    }
    
    return {
      success: true,
      message: `Parser CSV funcionando! Processadas ${result.transactions.length} transações`,
      data: {
        transactions: result.transactions,
        warnings: result.warnings,
        metadata: result.metadata
      }
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Erro no parser CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Testa a validação de transações
 */
export function testTransactionValidation(): {
  success: boolean;
  message: string;
  data?: any;
} {
  try {
    const testTransactions = createTestTransactions();
    const validation = validateRawTransactions(testTransactions);
    
    if (validation.valid.length !== testTransactions.length) {
      return {
        success: false,
        message: `Esperadas ${testTransactions.length} transações válidas, mas obteve ${validation.valid.length}`,
        data: { validation }
      };
    }
    
    if (validation.invalid.length > 0) {
      return {
        success: false,
        message: `Encontradas ${validation.invalid.length} transações inválidas`,
        data: { validation }
      };
    }
    
    return {
      success: true,
      message: `Validação funcionando! ${validation.valid.length} transações válidas`,
      data: { validation }
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Testa informações sobre formatos suportados
 */
export function testSupportedFormats(): {
  success: boolean;
  message: string;
  data?: any;
} {
  try {
    const formats = getSupportedFormats();
    
    if (formats.length === 0) {
      return {
        success: false,
        message: 'Nenhum formato suportado encontrado'
      };
    }
    
    const expectedFormats = ['csv', 'xlsx', 'ofx', 'pdf'];
    const foundFormats = formats.map(f => f.type);
    
    for (const expected of expectedFormats) {
      if (!foundFormats.includes(expected as any)) {
        return {
          success: false,
          message: `Formato ${expected} não encontrado na lista de suportados`
        };
      }
    }
    
    return {
      success: true,
      message: `Formatos suportados OK! Encontrados: ${foundFormats.join(', ')}`,
      data: { formats }
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Erro ao obter formatos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Executa todos os testes
 */
export async function runAllTests(): Promise<{
  success: boolean;
  results: Array<{
    test: string;
    success: boolean;
    message: string;
    data?: any;
  }>;
}> {
  const results = [];
  
  // Teste 1: Formatos suportados
  const formatsTest = testSupportedFormats();
  results.push({
    test: 'Formatos Suportados',
    ...formatsTest
  });
  
  // Teste 2: Validação de transações
  const validationTest = testTransactionValidation();
  results.push({
    test: 'Validação de Transações',
    ...validationTest
  });
  
  // Teste 3: Parser CSV
  const csvTest = await testCSVParser();
  results.push({
    test: 'Parser CSV',
    ...csvTest
  });
  
  // Verifica se todos os testes passaram
  const allSuccess = results.every(r => r.success);
  
  return {
    success: allSuccess,
    results
  };
}

/**
 * Exibe resultados dos testes no console (para debugging)
 */
export function logTestResults(results: Awaited<ReturnType<typeof runAllTests>>): void {
  console.log('\n=== RESULTADOS DOS TESTES DE FILE PARSERS ===');
  
  results.results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.test}: ${result.message}`);
    
    if (result.data && !result.success) {
      console.log('   Dados:', result.data);
    }
  });
  
  console.log(`\nResumo: ${results.success ? 'TODOS OS TESTES PASSARAM' : 'ALGUNS TESTES FALHARAM'}`);
  console.log(`Sucessos: ${results.results.filter(r => r.success).length}/${results.results.length}`);
  console.log('=== FIM DOS TESTES ===\n');
}