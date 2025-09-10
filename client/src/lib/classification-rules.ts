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
 * Regras de classificação em ordem de precedência
 */
const CLASSIFICATION_RULES = [
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
 * Classifica uma transação bancária baseado no histórico
 * 
 * @param historico - O histórico da transação bancária
 * @returns Objeto com categoria e se é operacional
 */
export function classifyTransaction(historico: string): ClassificationResult {
  // Converte para uppercase para comparação case-insensitive
  const historicoUpper = historico.toUpperCase();

  // Verifica cada regra em ordem de precedência
  for (const rule of CLASSIFICATION_RULES) {
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