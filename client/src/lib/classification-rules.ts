/**
 * Sistema de Classificação de Transações Bancárias - Clínica Basile
 * 
 * Implementa as regras de classificação em ordem de precedência.
 * A primeira regra que bater, classifica a transação.
 */

export interface ClassificationResult {
  categoria: string;
  ehOperacional: boolean;
}

/**
 * Interface para resultado completo da classificação avançada
 */
export interface AdvancedClassificationResult {
  categoria: string;
  ehOperacional: boolean;
  ehMovtoFinanceiro: boolean;
  ehImposto: boolean;
  ehSalarioPalavra: boolean;
  ehSalarioHeuristico: boolean;
  salarioConfirmado: boolean;
  classificacaoFinal: string;
  needsReview: boolean;
  reviewReason?: string;
  confidenceScore: number;
}

/**
 * Interface para configuração de dicionários
 */
export interface ClassificationDictionaries {
  funcionarios?: string[];
  fornecedores?: string[];
}

/**
 * Palavras-chave para transações que devem ser completamente ignoradas
 */
const IGNORE_KEYWORDS = [
  "APLICACAO CONTAMAX",
  "APLICAÇÃO CONTAMAX",
  "RESGATE CONTAMAX",
  "AUTOMATICO",
  "AUTOMÁTICO"
];

/**
 * Detecta se uma transação deve ser completamente ignorada (CONTAMAX, etc.)
 */
export function shouldIgnoreTransaction(historico: string): boolean {
  const historicoUpper = historico.toUpperCase();
  
  for (const keyword of IGNORE_KEYWORDS) {
    if (historicoUpper.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Regras de classificação em ordem de precedência
 */
const CLASSIFICATION_RULES = [
  // 0. Transações a serem ignoradas (primeira prioridade)
  {
    keywords: IGNORE_KEYWORDS,
    categoria: "IGNORAR – Movimentações CONTAMAX/Automáticas",
    ehOperacional: false
  },
  // 1. Movimentações Financeiras (não operacionais)
  {
    keywords: [
      "RESGATE CONTAMAX",
      "RESGATE", 
      "APLICACAO",
      "APLICAÇÃO",
      "CONTA INVESTIMENTO",
      "TRANSFERENCIA ENTRE CONTAS",
      "TRANSFERÊNCIA ENTRE CONTAS",
      "TED ENTRE CONTAS",
      "DOC ENTRE CONTAS"
    ],
    categoria: "Movimentação Financeira – não operacional",
    ehOperacional: false
  },

  // 2. Receitas
  {
    keywords: [
      "PIX RECEBIDO",
      "CREDITO",
      "CRÉDITO", 
      "DEPOSITO",
      "DEPÓSITO",
      // Pagamentos de cartão (recebimento)
      "GETNET-VISA",
      "GETNET-MAESTRO",
      "PAGAMENTO CARTAO DE DEBITO GETNET-VISA",
      "PAGAMENTO CARTAO DE DEBITO GETNET-MAESTRO",
      // Nomes de convênios/operadoras (podem ser expandidos)
      "UNIMED",
      "AMIL",
      "BRADESCO SAUDE",
      "BRADESCO SAÚDE",
      "SULAMERICA",
      "SULAMÉRICA",
      "PORTO SEGURO",
      "HAPVIDA",
      "NOTREDAME",
      "NOTRE DAME",
      "GOLDEN CROSS",
      "MEDIAL SAUDE",
      "MEDIAL SAÚDE",
      "PREVENT SENIOR",
      "CASSI",
      "GEAP",
      "PETROBRAS",
      "SAÚDE CAIXA"
    ],
    categoria: "Receita – PIX/Outros Recebimentos",
    ehOperacional: true
  },

  // 3. Despesas – Boletos/Fornecedores
  {
    keywords: [
      "BOLETO",
      "DUPLICATA", 
      "FORNECEDOR"
    ],
    categoria: "Despesa – Boletos/Fornecedores",
    ehOperacional: true
  },

  // 4. Despesas – Folha de Pagamento
  {
    keywords: [
      "SALARIO",
      "SALÁRIO",
      "FOLHA",
      "FERIAS",
      "FÉRIAS",
      "PRO-LABORE", 
      "PRÓ-LABORE",
      "VALE",
      "INSS FOLHA"
    ],
    categoria: "Despesa – Folha de Pagamento",
    ehOperacional: true
  },

  // 5. Despesas – Impostos
  {
    keywords: [
      "DARF",
      "GPS",
      "INSS",
      "IRPJ",
      "CSLL",
      "ISS",
      "ICMS",
      "TRIBUTO",
      "IMPOSTO",
      "MUNICIPIO",
      "PREFEITURA"
    ],
    categoria: "Despesa – Impostos",
    ehOperacional: true
  },

  // 6. Despesas – Contas Fixas  
  {
    keywords: [
      "CONTA",
      "CELULAR",
      "TELEFONIA",
      "INTERNET",
      "ENERGIA",
      "ÁGUA",
      "ALUGUEL",
      "MÁQUINAS CARTÃO",
      "TARIFA",
      "MENSALIDADE",
      "SERVIÇO"
    ],
    categoria: "Despesa – Contas Fixas",
    ehOperacional: true
  },

  // 7. Despesa – PIX Enviado
  {
    keywords: [
      "PIX ENVIADO"
    ],
    categoria: "Despesa – PIX Enviado", 
    ehOperacional: true
  }
];

/**
 * Padrões de contas bancárias
 */
const ACCOUNT_PATTERNS = [
  /\d{4}\.\d{2}\.\d{6}-\d/, // Padrão: 3742.13.007880-5
  /CONTA\s*\d+/,
  /AGENCIA\s*\d+/,
  /AG\s*\d+/
];

/**
 * Palavras-chave para movimentações financeiras internas
 */
const FINANCIAL_MOVEMENT_KEYWORDS = [
  "RESGATE CONTAMAX",
  "RESGATE",
  "APLICACAO",
  "APLICAÇÃO",
  "CONTA INVESTIMENTO",
  "TRANSFERENCIA ENTRE CONTAS",
  "TRANSFERÊNCIA ENTRE CONTAS",
  "ENTRE CONTAS",
  "MESMO TITULAR",
  "TED ENTRE CONTAS",
  "DOC ENTRE CONTAS",
  "TED - CREDITO",
  "TED - CRÉDITO",
  "DOC - CREDITO",
  "DOC - CRÉDITO"
];

/**
 * Palavras-chave para impostos (expandida)
 */
const TAX_KEYWORDS = [
  "DARF",
  "GPS", 
  "INSS",
  "FGTS",
  "IRPJ",
  "IRRF",
  "CSLL",
  "ISS",
  "ICMS",
  "TRIBUTO",
  "IMPOSTO",
  "DAS",
  "SIMPLES NACIONAL",
  "RECEITA FEDERAL",
  "MUNICIPIO",
  "MUNICÍPIO",
  "MUNICIPAL",
  "PREFEITURA",
  "GNRE",
  "GARE",
  "GRU",
  "ESOCIAL",
  "SEFIP",
  "DCTF",
  "GOVERNO FEDERAL",
  "FAZENDA"
];

/**
 * Palavras-chave estrita para salários
 */
const SALARY_KEYWORDS = [
  "SALARIO",
  "SALÁRIO",
  "FOLHA",
  "FOLHA DE PAGAMENTO",
  "PRO-LABORE",
  "PRÓ-LABORE",
  "13º",
  "13°",
  "DÉCIMO TERCEIRO",
  "DECIMO TERCEIRO",
  "FERIAS",
  "FÉRIAS",
  "ADIANTAMENTO",
  "ADIANTAMENTO SALARIAL",
  "HOLERITE",
  "CONTRACHEQUE",
  "INSS FOLHA",
  "VT",
  "VR", 
  "VA",
  "VALE TRANSPORTE",
  "VALE REFEIÇÃO",
  "VALE ALIMENTAÇÃO"
];

/**
 * Termos que indicam empresa (para exclusão na heurística PIX)
 */
const COMPANY_TERMS = [
  "LTDA",
  "LTDA.",
  "S/A",
  "SA",
  "ME",
  "EPP",
  "EIRELI",
  "COMERCIO",
  "COMÉRCIO",
  "SERVICOS",
  "SERVIÇOS",
  "EMPRESA",
  "INDUSTRIA",
  "INDÚSTRIA",
  "CLINICA",
  "CLÍNICA",
  "HOSPITAL",
  "LABORATORIO",
  "LABORATÓRIO"
];

/**
 * Detecta se é uma movimentação financeira interna
 */
export function detectFinancialMovement(historico: string): boolean {
  const historicoUpper = historico.toUpperCase();

  // Verifica palavras-chave específicas
  for (const keyword of FINANCIAL_MOVEMENT_KEYWORDS) {
    if (historicoUpper.includes(keyword)) {
      return true;
    }
  }

  // Verifica padrões de conta bancária
  for (const pattern of ACCOUNT_PATTERNS) {
    if (pattern.test(historicoUpper)) {
      return true;
    }
  }

  return false;
}

/**
 * Detecta se é um imposto usando word boundaries para evitar falsos positivos
 */
export function detectTax(historico: string): boolean {
  const historicoUpper = historico.toUpperCase();

  for (const keyword of TAX_KEYWORDS) {
    // Casos especiais que precisam de contexto adicional
    if (keyword === 'DAS') {
      // DAS deve aparecer com contexto tributário ou isolado, não como preposição "das"
      const dasRegex = /\b(DAS[\s\-]*(SIMPLES|NACIONAL|FEDERAL|TRIBUTO|IMPOSTO)|\bDAS\s*[\d]+|\bDAS\b(?=\s*$)|PAGAMENTO.*DAS|GUIA.*DAS)/i;
      if (dasRegex.test(historicoUpper)) {
        return true;
      }
    }
    // Para outras palavras muito curtas ou siglas específicas, usa word boundary
    else if (keyword.length <= 3 || ['ISS', 'GPS'].includes(keyword)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(historicoUpper)) {
        return true;
      }
    } else {
      // Para palavras maiores, mantém substring matching
      if (historicoUpper.includes(keyword)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detecta salário por palavra-chave estrita usando word boundaries
 */
export function detectSalaryByKeyword(historico: string): boolean {
  const historicoUpper = historico.toUpperCase();

  for (const keyword of SALARY_KEYWORDS) {
    // Para palavras muito curtas (siglas), usa word boundary
    if (keyword.length <= 2) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(historicoUpper)) {
        return true;
      }
    } else {
      // Para palavras maiores, mantém substring matching
      if (historicoUpper.includes(keyword)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detecta se parece com nome de pessoa (heurística simples)
 */
function looksLikePersonName(text: string): boolean {
  const words = text.trim().split(/\s+/);
  
  // Deve ter pelo menos 2 palavras
  if (words.length < 2) return false;

  // Não deve conter termos de empresa
  const textUpper = text.toUpperCase();
  for (const companyTerm of COMPANY_TERMS) {
    if (textUpper.includes(companyTerm)) {
      return false;
    }
  }

  // Palavras devem começar com maiúscula (indicativo de nome próprio)
  return words.every(word => word.length > 0 && word[0].toUpperCase() === word[0]);
}

/**
 * Detecta se o dia está no range típico de pagamento (1-12)
 */
function isPayrollDay(data: string): boolean {
  try {
    const date = new Date(data);
    const day = date.getDate();
    return day >= 1 && day <= 12;
  } catch {
    return false;
  }
}

/**
 * Heurística para detectar PIX de salário
 * Regras:
 * - Contém "PIX ENVIADO"
 * - Valor negativo (saída)
 * - Nome parece pessoa (não empresa)
 * - Data entre dias 1-12 do mês
 */
export function detectSalaryByHeuristic(historico: string, valor: number, data: string): boolean {
  const historicoUpper = historico.toUpperCase();

  // Deve conter PIX ENVIADO
  if (!historicoUpper.includes("PIX ENVIADO")) {
    return false;
  }

  // Deve ser valor negativo (saída de dinheiro)
  if (valor >= 0) {
    return false;
  }

  // Deve estar em dia típico de pagamento
  if (!isPayrollDay(data)) {
    return false;
  }

  // Extrai o nome do beneficiário (após "PIX ENVIADO")
  const pixIndex = historicoUpper.indexOf("PIX ENVIADO");
  const afterPix = historico.substring(pixIndex + "PIX ENVIADO".length).trim();
  
  if (!afterPix) {
    return false;
  }

  // O nome deve parecer uma pessoa, não empresa
  return looksLikePersonName(afterPix);
}

/**
 * Verifica se o beneficiário está na lista de funcionários
 */
export function checkEmployeeList(historico: string, funcionarios?: string[]): boolean {
  if (!funcionarios || funcionarios.length === 0) {
    return false;
  }

  const historicoUpper = historico.toUpperCase();
  
  return funcionarios.some(funcionario => {
    const funcionarioUpper = funcionario.toUpperCase();
    return historicoUpper.includes(funcionarioUpper);
  });
}

/**
 * Verifica se o beneficiário está na lista de fornecedores
 */
export function checkSupplierList(historico: string, fornecedores?: string[]): boolean {
  if (!fornecedores || fornecedores.length === 0) {
    return false;
  }

  const historicoUpper = historico.toUpperCase();
  
  return fornecedores.some(fornecedor => {
    const fornecedorUpper = fornecedor.toUpperCase();
    return historicoUpper.includes(fornecedorUpper);
  });
}

/**
 * Classifica uma transação bancária baseado no histórico
 * 
 * @param historico - O histórico da transação bancária
 * @returns Objeto com categoria e se é operacional
 */
export function classifyTransaction(historico: string): ClassificationResult {
  // Primeira verificação: transações a serem ignoradas
  if (shouldIgnoreTransaction(historico)) {
    return {
      categoria: "IGNORAR – Movimentações CONTAMAX/Automáticas",
      ehOperacional: false
    };
  }

  // Converte para uppercase para comparação case-insensitive
  const historicoUpper = historico.toUpperCase();

  // Verifica cada regra em ordem de precedência (pula a regra 0 - IGNORAR)
  for (let i = 1; i < CLASSIFICATION_RULES.length; i++) {
    const rule = CLASSIFICATION_RULES[i];
    for (const keyword of rule.keywords) {
      if (historicoUpper.includes(keyword)) {
        return {
          categoria: rule.categoria,
          ehOperacional: rule.ehOperacional
        };
      }
    }
  }

  // Caso padrão: Outros
  return {
    categoria: "Outros",
    ehOperacional: true
  };
}

/**
 * Classificação avançada de transações bancárias
 * Implementa lógica de prioridade e detecção heurística
 * 
 * @param historico - O histórico da transação
 * @param valor - O valor da transação (negativo para saídas)
 * @param data - A data da transação (formato ISO ou string)
 * @param funcionarios - Lista opcional de funcionários
 * @param fornecedores - Lista opcional de fornecedores
 * @returns Resultado completo da classificação avançada
 */
export function classifyTransactionAdvanced(
  historico: string,
  valor: number,
  data: string,
  funcionarios?: string[],
  fornecedores?: string[]
): AdvancedClassificationResult {
  // Primeira verificação: transações a serem ignoradas
  if (shouldIgnoreTransaction(historico)) {
    return {
      categoria: "IGNORAR – Movimentações CONTAMAX/Automáticas",
      ehOperacional: false,
      ehMovtoFinanceiro: false,
      ehImposto: false,
      ehSalarioPalavra: false,
      ehSalarioHeuristico: false,
      salarioConfirmado: false,
      classificacaoFinal: "IGNORAR – Movimentações CONTAMAX/Automáticas",
      needsReview: false,
      confidenceScore: 1.0
    };
  }

  // Executa todas as detecções
  const ehMovtoFinanceiro = detectFinancialMovement(historico);
  const ehImposto = detectTax(historico);
  const ehSalarioPalavra = detectSalaryByKeyword(historico);
  const ehSalarioHeuristico = detectSalaryByHeuristic(historico, valor, data);
  
  // Verifica dicionários
  const ehFuncionario = checkEmployeeList(historico, funcionarios);
  const ehFornecedor = checkSupplierList(historico, fornecedores);

  // Inicia resultado base
  let categoria = "Outros";
  let ehOperacional = true;
  let classificacaoFinal = "Outros";
  let needsReview = false;
  let salarioConfirmado = false;

  // LÓGICA DE PRIORIDADE

  // 1. PRIMEIRA PRIORIDADE: Movimentação Financeira
  if (ehMovtoFinanceiro) {
    categoria = "Movimentação Financeira – não operacional";
    ehOperacional = false;
    classificacaoFinal = "Movimentação Financeira (não operacional)";
  }
  
  // 2. SEGUNDA PRIORIDADE: Impostos
  else if (ehImposto) {
    categoria = "Despesa – Impostos";
    ehOperacional = true;
    classificacaoFinal = "Imposto";
  }
  
  // 3. TERCEIRA PRIORIDADE: Salários por palavra-chave
  else if (ehSalarioPalavra) {
    categoria = "Despesa – Folha de Pagamento";
    ehOperacional = true;
    classificacaoFinal = "Salário (confirmado)";
    salarioConfirmado = true;
  }
  
  // 4. QUARTA PRIORIDADE: Funcionários na whitelist
  else if (ehFuncionario) {
    categoria = "Despesa – Folha de Pagamento";
    ehOperacional = true;
    classificacaoFinal = "Salário (confirmado)";
    salarioConfirmado = true;
  }
  
  // 5. QUINTA PRIORIDADE: Salários por heurística PIX
  else if (ehSalarioHeuristico) {
    categoria = "Despesa – Folha de Pagamento";
    ehOperacional = true;
    classificacaoFinal = "Salário (heurístico)";
    needsReview = true; // Sinaliza que precisa revisão manual
  }
  
  // 6. OUTRAS CLASSIFICAÇÕES: Usa regras tradicionais
  else {
    const baseClassification = classifyTransaction(historico);
    categoria = baseClassification.categoria;
    ehOperacional = baseClassification.ehOperacional;
    
    // Define classificação final específica
    if (ehFornecedor) {
      classificacaoFinal = "Fornecedor (confirmado)";
    } else if (categoria === "Receita – PIX/Outros Recebimentos") {
      classificacaoFinal = "Receita";
    } else if (categoria === "Despesa – Boletos/Fornecedores") {
      classificacaoFinal = "Fornecedor";
    } else if (categoria === "Despesa – Contas Fixas") {
      classificacaoFinal = "Contas Fixas";
    } else if (categoria === "Despesa – PIX Enviado") {
      classificacaoFinal = "PIX Enviado";
      needsReview = true; // PIX sem classificação específica pode precisar revisão
    } else {
      classificacaoFinal = "Outros";
      needsReview = true; // Transações não classificadas precisam revisão
    }
  }

  // Calcula motivo da revisão baseado na lógica aplicada
  let reviewReason: string | undefined;
  if (needsReview) {
    if (ehSalarioHeuristico) {
      reviewReason = "PIX para pessoa física em período de pagamento - verificar se é salário";
    } else if (categoria === "Despesa – PIX Enviado") {
      reviewReason = "PIX enviado sem classificação específica";
    } else if (categoria === "Outros") {
      reviewReason = "Transação não classificada automaticamente";
    } else {
      reviewReason = "Transação marcada para revisão manual";
    }
  }

  // Calcula score de confiança baseado no tipo de classificação
  let confidenceScore = 1.0; // Default: máxima confiança
  
  if (ehMovtoFinanceiro) {
    confidenceScore = 0.95; // Alta confiança - padrões bem definidos
  } else if (ehImposto) {
    confidenceScore = 0.95; // Alta confiança - palavras-chave específicas
  } else if (ehSalarioPalavra || salarioConfirmado) {
    confidenceScore = 0.98; // Altíssima confiança - confirmação explícita
  } else if (ehFuncionario) {
    confidenceScore = 0.92; // Alta confiança - whitelist confirmada
  } else if (ehSalarioHeuristico) {
    confidenceScore = 0.75; // Confiança média - baseado em heurística
  } else if (ehFornecedor) {
    confidenceScore = 0.88; // Boa confiança - whitelist fornecedores
  } else if (categoria === "Receita – PIX/Outros Recebimentos") {
    confidenceScore = 0.85; // Boa confiança - receitas geralmente bem identificadas
  } else if (categoria === "Outros") {
    confidenceScore = 0.60; // Baixa confiança - não classificado
  } else {
    confidenceScore = 0.80; // Confiança padrão para outras classificações
  }

  return {
    categoria,
    ehOperacional,
    ehMovtoFinanceiro,
    ehImposto,
    ehSalarioPalavra,
    ehSalarioHeuristico,
    salarioConfirmado,
    classificacaoFinal,
    needsReview,
    reviewReason,
    confidenceScore
  };
}

/**
 * Função para adicionar novos convênios/operadoras de saúde à lista de receitas
 * (Para futura expansão via whitelist)
 */
export function addHealthInsuranceKeywords(newKeywords: string[]): void {
  const receitasRule = CLASSIFICATION_RULES.find(rule => 
    rule.categoria === "Receita – PIX/Outros Recebimentos"
  );
  
  if (receitasRule) {
    receitasRule.keywords.push(...newKeywords.map(k => k.toUpperCase()));
  }
}

/**
 * Função para adicionar novos fornecedores à lista de boletos/fornecedores
 * (Para futura expansão via whitelist)
 */
export function addSupplierKeywords(newKeywords: string[]): void {
  const fornecedoresRule = CLASSIFICATION_RULES.find(rule => 
    rule.categoria === "Despesa – Boletos/Fornecedores"
  );
  
  if (fornecedoresRule) {
    fornecedoresRule.keywords.push(...newKeywords.map(k => k.toUpperCase()));
  }
}

/**
 * Obtém todas as categorias possíveis
 */
export function getAllCategories(): string[] {
  const categories = CLASSIFICATION_RULES.map(rule => rule.categoria);
  categories.push("Outros"); // Adiciona a categoria padrão
  return Array.from(new Set(categories)); // Remove duplicatas
}

/**
 * Obtém estatísticas das regras de classificação
 */
export function getClassificationStats(): {
  totalRules: number;
  totalKeywords: number;
  categoriesByType: { operacional: string[]; naoOperacional: string[] };
} {
  const totalRules = CLASSIFICATION_RULES.length;
  const totalKeywords = CLASSIFICATION_RULES.reduce((sum, rule) => sum + rule.keywords.length, 0);
  
  const operacional = CLASSIFICATION_RULES
    .filter(rule => rule.ehOperacional)
    .map(rule => rule.categoria);
    
  const naoOperacional = CLASSIFICATION_RULES
    .filter(rule => !rule.ehOperacional)
    .map(rule => rule.categoria);

  return {
    totalRules,
    totalKeywords,
    categoriesByType: {
      operacional,
      naoOperacional
    }
  };
}

/**
 * Função utilitária para criar dicionários de exemplo
 */
export function createSampleDictionaries(): ClassificationDictionaries {
  return {
    funcionarios: [
      "João Silva Santos",
      "Maria Oliveira Costa",
      "Carlos Alberto Souza",
      "Ana Paula Lima",
      "Roberto Pereira"
    ],
    fornecedores: [
      "MEDICA LTDA",
      "FARMACIA CENTRAL",
      "MATERIAL HOSPITALAR SA",
      "LIMPEZA EXPRESS LTDA",
      "SEGURANÇA TOTAL LTDA"
    ]
  };
}

/**
 * Casos de teste para validação do sistema avançado
 */
export function runClassificationTests(): void {
  console.log("=== TESTES DO SISTEMA AVANÇADO DE CLASSIFICAÇÃO ===");
  
  const sampleDicts = createSampleDictionaries();
  
  // Teste 1: Movimentação Financeira
  console.log("\n1. MOVIMENTAÇÃO FINANCEIRA:");
  const teste1 = classifyTransactionAdvanced(
    "RESGATE CONTAMAX APLICACAO 12345",
    -1000,
    "2024-09-15",
    sampleDicts.funcionarios,
    sampleDicts.fornecedores
  );
  console.log("Histórico: 'RESGATE CONTAMAX APLICACAO 12345'");
  console.log("Resultado:", teste1.classificacaoFinal);
  console.log("É Movimentação:", teste1.ehMovtoFinanceiro);
  console.log("É Operacional:", teste1.ehOperacional);

  // Teste 2: Impostos
  console.log("\n2. IMPOSTOS:");
  const teste2 = classifyTransactionAdvanced(
    "DARF TRIBUTOS FEDERAIS IRPJ",
    -5000,
    "2024-09-10",
    sampleDicts.funcionarios,
    sampleDicts.fornecedores
  );
  console.log("Histórico: 'DARF TRIBUTOS FEDERAIS IRPJ'");
  console.log("Resultado:", teste2.classificacaoFinal);
  console.log("É Imposto:", teste2.ehImposto);

  // Teste 3: Salário por palavra-chave
  console.log("\n3. SALÁRIO (PALAVRA-CHAVE):");
  const teste3 = classifyTransactionAdvanced(
    "FOLHA DE PAGAMENTO SETEMBRO 2024",
    -8000,
    "2024-09-05",
    sampleDicts.funcionarios,
    sampleDicts.fornecedores
  );
  console.log("Histórico: 'FOLHA DE PAGAMENTO SETEMBRO 2024'");
  console.log("Resultado:", teste3.classificacaoFinal);
  console.log("É Salário Palavra:", teste3.ehSalarioPalavra);
  console.log("Salário Confirmado:", teste3.salarioConfirmado);

  // Teste 4: Salário por funcionário conhecido
  console.log("\n4. SALÁRIO (FUNCIONÁRIO CONHECIDO):");
  const teste4 = classifyTransactionAdvanced(
    "PIX ENVIADO JOÃO SILVA SANTOS",
    -3500,
    "2024-09-05",
    sampleDicts.funcionarios,
    sampleDicts.fornecedores
  );
  console.log("Histórico: 'PIX ENVIADO JOÃO SILVA SANTOS'");
  console.log("Resultado:", teste4.classificacaoFinal);
  console.log("Salário Confirmado:", teste4.salarioConfirmado);

  // Teste 5: Salário por heurística PIX
  console.log("\n5. SALÁRIO (HEURÍSTICA PIX):");
  const teste5 = classifyTransactionAdvanced(
    "PIX ENVIADO FULANO SILVA OLIVEIRA",
    -2800,
    "2024-09-05",
    [], // Sem lista de funcionários
    sampleDicts.fornecedores
  );
  console.log("Histórico: 'PIX ENVIADO FULANO SILVA OLIVEIRA'");
  console.log("Resultado:", teste5.classificacaoFinal);
  console.log("É Salário Heurístico:", teste5.ehSalarioHeuristico);
  console.log("Precisa Revisão:", teste5.needsReview);

  // Teste 6: Fornecedor conhecido
  console.log("\n6. FORNECEDOR (CONHECIDO):");
  const teste6 = classifyTransactionAdvanced(
    "PIX ENVIADO MEDICA LTDA EQUIPAMENTOS",
    -1200,
    "2024-09-10",
    sampleDicts.funcionarios,
    sampleDicts.fornecedores
  );
  console.log("Histórico: 'PIX ENVIADO MEDICA LTDA EQUIPAMENTOS'");
  console.log("Resultado:", teste6.classificacaoFinal);

  // Teste 7: Receita de convênio
  console.log("\n7. RECEITA (CONVÊNIO):");
  const teste7 = classifyTransactionAdvanced(
    "PIX RECEBIDO UNIMED CONSULTAS",
    4500,
    "2024-09-12",
    sampleDicts.funcionarios,
    sampleDicts.fornecedores
  );
  console.log("Histórico: 'PIX RECEBIDO UNIMED CONSULTAS'");
  console.log("Resultado:", teste7.classificacaoFinal);

  // Teste 8: Outros/Não classificado
  console.log("\n8. OUTROS (NÃO CLASSIFICADO):");
  const teste8 = classifyTransactionAdvanced(
    "COMPRA CARTAO DIVERSOS MATERIAIS",
    -350,
    "2024-09-15",
    sampleDicts.funcionarios,
    sampleDicts.fornecedores
  );
  console.log("Histórico: 'COMPRA CARTAO DIVERSOS MATERIAIS'");
  console.log("Resultado:", teste8.classificacaoFinal);
  console.log("Precisa Revisão:", teste8.needsReview);
  
  console.log("\n=== TESTES CONCLUÍDOS ===");
}

/**
 * Testa detecção específica de padrões de conta
 */
export function testAccountPatterns(): void {
  console.log("\n=== TESTE DE PADRÕES DE CONTA ===");
  
  const testCases = [
    "TED ENVIADO AGENCIA 3742 CONTA 007880-5",
    "TRANSFERENCIA ENTRE CONTAS MESMO TITULAR",
    "DOC - CREDITO AG 1234 CC 567890-1",
    "PIX ENVIADO MARIA SILVA"
  ];
  
  testCases.forEach((historico, index) => {
    const isFinancialMovement = detectFinancialMovement(historico);
    console.log(`${index + 1}. "${historico}"`);
    console.log(`   É Movimentação Financeira: ${isFinancialMovement}`);
  });
}

/**
 * Testa detecção de salário heurístico com diferentes cenários
 */
export function testSalaryHeuristic(): void {
  console.log("\n=== TESTE DE HEURÍSTICA DE SALÁRIO ===");
  
  const testCases = [
    { historico: "PIX ENVIADO FULANO SILVA", valor: -2800, data: "2024-09-05" },
    { historico: "PIX ENVIADO EMPRESA LTDA", valor: -2800, data: "2024-09-05" },
    { historico: "PIX ENVIADO FULANO SILVA", valor: -2800, data: "2024-09-15" },
    { historico: "PIX ENVIADO FULANO SILVA", valor: 2800, data: "2024-09-05" },
    { historico: "TRANSFERENCIA FULANO SILVA", valor: -2800, data: "2024-09-05" }
  ];
  
  testCases.forEach((testCase, index) => {
    const isSalaryHeuristic = detectSalaryByHeuristic(
      testCase.historico, 
      testCase.valor, 
      testCase.data
    );
    console.log(`${index + 1}. "${testCase.historico}" (${testCase.valor}, ${testCase.data})`);
    console.log(`   É Salário Heurístico: ${isSalaryHeuristic}`);
  });
}

/**
 * Função de conveniência para executar todos os testes
 */
export function runAllTests(): void {
  runClassificationTests();
  testAccountPatterns();
  testSalaryHeuristic();
}

/**
 * Função para obter relatório de cobertura das regras
 */
export function getAdvancedClassificationStats(): {
  detectorsAvailable: string[];
  keywordCounts: {
    financialMovement: number;
    taxes: number;
    salaries: number;
    companies: number;
  };
  accountPatterns: number;
} {
  return {
    detectorsAvailable: [
      "detectFinancialMovement",
      "detectTax", 
      "detectSalaryByKeyword",
      "detectSalaryByHeuristic",
      "checkEmployeeList",
      "checkSupplierList"
    ],
    keywordCounts: {
      financialMovement: FINANCIAL_MOVEMENT_KEYWORDS.length,
      taxes: TAX_KEYWORDS.length,
      salaries: SALARY_KEYWORDS.length,
      companies: COMPANY_TERMS.length
    },
    accountPatterns: ACCOUNT_PATTERNS.length
  };
}