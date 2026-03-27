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

export const MACRO_CATEGORIES = {
  RECEITA: "Receita",
  BOLETOS_FORNECEDORES: "Despesa – Boletos/Fornecedores",
  CONTAS_FIXAS: "Despesa – Contas Fixas",
  FOLHA: "Despesa – Folha de Pagamento",
  IMPOSTOS: "Despesa – Impostos",
  PIX_ENVIADO: "PIX Enviado",
  MOVIMENTACAO_NAO_OPERACIONAL: "Movimentação Não Operacional",
  NAO_CLASSIFICADO: "Não Classificado"
} as const;

export type MacroCategory = typeof MACRO_CATEGORIES[keyof typeof MACRO_CATEGORIES];

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
  subcategoriaBoleto?: string;
}

/**
 * Interface para configuração de dicionários
 */
export interface ClassificationDictionaries {
  funcionarios?: string[];
  fornecedores?: string[];
}

export const ANALYTICAL_EXPENSE_CATEGORIES = {
  FOLHA_RH: "Folha de Pagamento / RH",
  SERVICO_ANESTESIA: "Serviço de Anestesia",
  MANUTENCAO: "Manutenção",
  TRANSFERENCIAS_INTERNAS: "Transferências Internas",
  CONTABILIDADE_ASSESSORIA: "Contabilidade / Assessoria",
  PIX_OUTROS_FORNECEDORES: "PIX Enviado – Outros Fornecedores"
} as const;

export type AnalyticalExpenseCategory =
  typeof ANALYTICAL_EXPENSE_CATEGORIES[keyof typeof ANALYTICAL_EXPENSE_CATEGORIES];

export type CounterpartyType =
  | "funcionario"
  | "fornecedor"
  | "conta_propria"
  | "assessoria"
  | "prestador_servico";

export interface CounterpartyRecord {
  nome_normalizado: string;
  aliases: string[];
  tipo_contraparte: CounterpartyType;
  categoria_analitica_final: AnalyticalExpenseCategory;
  ativo: boolean;
}

const makeCounterparty = (
  nome_normalizado: string,
  aliases: string[],
  tipo_contraparte: CounterpartyType,
  categoria_analitica_final: AnalyticalExpenseCategory
): CounterpartyRecord => ({
  nome_normalizado,
  aliases,
  tipo_contraparte,
  categoria_analitica_final,
  ativo: true
});

export const DEFAULT_COUNTERPARTIES: CounterpartyRecord[] = [
  // RH
  makeCounterparty("MARCELLA", ["MARCELLA", "MARCELLA CAVINATTO SALIBE"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("FRANCIELE", ["FRANCIELE", "FRANCIELE DE QUEIROZ BUEN"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("IDALINA", ["IDALINA", "IDALINA FRANCISCA RIBEIRO"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("PALOMA", ["PALOMA", "PALOMA CAMILA FERREIRA"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("GRASIELLE", ["GRASIELLE", "GRASIELLE CRISTINA DOS SA"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("LAURA", ["LAURA", "LAURA DE AGUIAR CAMPANINI"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("GISELE", ["GISELE", "GISELE CESCATE"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("CHRISTIANE", ["CHRISTIANE", "CHRISTIANE MICHELLE DELLA"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("VANESSA", ["VANESSA", "VANESSA DE MORAES POLVERI"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("DAIANE", ["DAIANE", "DAIANE COSTA SANTOS"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("MARIA APARECIDA", ["MARIA APARECIDA"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("NILTON CESAR", ["NILTON CESAR", "NILTON CÉSAR", "NILTON CESAR RODRIGUES"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("JOSE GERALDO", ["JOSE GERALDO", "JOSÉ GERALDO"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("LEONARDO ROSSI", ["LEONARDO ROSSI"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("JONCIONE", ["JONCIONE", "JONCIONE RIBEIRO"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("VICTOR HUGO", ["VICTOR HUGO", "VICTOR HUGO ANDRADE"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("JULIANA", ["JULIANA", "JULIANA DE FAT"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("CILEUDA", ["CILEUDA", "CILEUDA MARIA PAULA"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("MAURICIO", ["MAURICIO", "MAURÍCIO", "MAURICIO FERNANDES"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  makeCounterparty("SUMAYA", ["SUMAYA", "SUMAYA SOUEN"], "funcionario", ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH),
  // Serviço de Anestesia
  makeCounterparty("JULIA GARCIA SILVESTRE", ["JULIA GARCIA SILVESTRE", "JULIA GARCIA"], "prestador_servico", ANALYTICAL_EXPENSE_CATEGORIES.SERVICO_ANESTESIA),
  makeCounterparty("THALES PEREIRA", ["THALES PEREIRA", "THALES PEREIRA DE VASCONCELLOS"], "prestador_servico", ANALYTICAL_EXPENSE_CATEGORIES.SERVICO_ANESTESIA),
  makeCounterparty("FERNANDO SOUZA DE DEUS", ["FERNANDO SOUZA DE DEUS", "FERNANDO SOUZA"], "prestador_servico", ANALYTICAL_EXPENSE_CATEGORIES.SERVICO_ANESTESIA),
  makeCounterparty("MAYARA MIRANDA", ["MAYARA MIRANDA", "MAYARA MIRANDA DE OLIVEIRA"], "prestador_servico", ANALYTICAL_EXPENSE_CATEGORIES.SERVICO_ANESTESIA),
  // Manutenção
  makeCounterparty("JULIANO MARQUES LEONI", ["JULIANO MARQUES LEONI", "JULIANO LEONI"], "fornecedor", ANALYTICAL_EXPENSE_CATEGORIES.MANUTENCAO),
  makeCounterparty("VINICIUS EDSON PEREIRA", ["VINICIUS EDSON PEREIRA", "VINICIUS PEREIRA"], "fornecedor", ANALYTICAL_EXPENSE_CATEGORIES.MANUTENCAO),
  // Transferências Internas
  makeCounterparty("CLINICA BASILE LTDA", ["CLINICA BASILE LTDA", "CLÍNICA BASILE LTDA"], "conta_propria", ANALYTICAL_EXPENSE_CATEGORIES.TRANSFERENCIAS_INTERNAS),
  // Contabilidade / Assessoria
  makeCounterparty("CESAR CONTABILIDADE LTDA", ["CESAR CONTABILIDADE LTDA", "CESAR CONTABILIDADE"], "assessoria", ANALYTICAL_EXPENSE_CATEGORIES.CONTABILIDADE_ASSESSORIA)
];

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
 * Fornecedores de Day Hospital (subcategorização)
 */
const DAY_HOSPITAL_SUPPLIERS = [
  "ATIVA COMERCIAL HOSPITALA",
  "MAZZEI COMERCIAL E REPRES",
  "CRISTALIA PRODUTOS QUIMIC",
  "BRASMEDICAL INDUSTRIA",
  "FRANCAMED PRODUTOS HOSPIT",
  "AIR LIQUIDE BRASIL",
  "LAVANDERIA ASPH",
  "KVO MEDICAL",
  "SUPERMED COMERCIO",
  "BIOLINE FIOS CIRURGICOS",
  "BIONEXO",
  "PRECISION COMERCIAL DISTR",
  "RHOSSE INST EQUIP",
  "JP IND FARMACEUTICA",
  "R P COM DE MAT HOSP"
];

/**
 * Mapeamento de fornecedores de boletos com suas subcategorias
 */
interface BoletoSupplier {
  nome: string;
  subcategoria: "MADAH" | "FITA DE SILICONE" | "INFRAESTRUTURA" | "MARKETING";
}

const BOLETO_SUPPLIERS: BoletoSupplier[] = [
  // MADAH
  { nome: "PROLKORP", subcategoria: "MADAH" },
  
  // FITA DE SILICONE
  { nome: "MEDICAL SALES DO BRASIL L", subcategoria: "FITA DE SILICONE" },
  
  // INFRAESTRUTURA
  { nome: "T. H. A. SCOTT ARMAZENA", subcategoria: "INFRAESTRUTURA" },
  { nome: "ROGER - COMERCIO DISTRIBUBU", subcategoria: "INFRAESTRUTURA" },
  { nome: "JOSE LUIZ SEIXAS E SEIXAS", subcategoria: "INFRAESTRUTURA" },
  { nome: "RELOAD COMERCIO E SERVICO", subcategoria: "INFRAESTRUTURA" },
  { nome: "PATRICIA DA COSTA OLIVEIR", subcategoria: "INFRAESTRUTURA" },
  { nome: "LC FELTRIN LAVAGENS E PO", subcategoria: "INFRAESTRUTURA" },
  { nome: "CASA DAS CERAS LTDA", subcategoria: "INFRAESTRUTURA" },
  { nome: "SW SERVICOS EM MEDICINA", subcategoria: "INFRAESTRUTURA" },
  { nome: "OSCAR BARCELLOS F 3614764", subcategoria: "INFRAESTRUTURA" },
  { nome: "SIND EMPREG ESTAB SAUDE D", subcategoria: "INFRAESTRUTURA" },
  { nome: "WIN ADMINISTRADORA DE BEN", subcategoria: "INFRAESTRUTURA" },
  { nome: "GESTAR-ASSESSORIA A E SIN", subcategoria: "INFRAESTRUTURA" },
  { nome: "MEDICAR EMERGENCIAS MEDIC", subcategoria: "INFRAESTRUTURA" },
  { nome: "SIND EMP TURISMO E HOSP D", subcategoria: "INFRAESTRUTURA" },
  { nome: "BELGO ASSISTENCIA TECNICA", subcategoria: "INFRAESTRUTURA" },
  { nome: "CESAR CONTABILIDADE LTDA", subcategoria: "INFRAESTRUTURA" },
  { nome: "DANUBIA A. DE O. TOLOTTI", subcategoria: "INFRAESTRUTURA" },
  
  // MARKETING
  { nome: "GALVANI E BACHIM COMUNICA", subcategoria: "MARKETING" }
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
  },

  // 8. IOF Adicional – Não Operacional (Taxas/Financeiro)
  {
    keywords: [
      "IOF ADICIONAL",
      "IOF AUTOMATICO",
      "IOF AUTOMÁTICO"
    ],
    categoria: "Não Operacional – Taxas/Financeiro (IOF)",
    ehOperacional: false
  },

  // 9. Despesa Operacional – Day Hospital (será detectado via checkDayHospitalSupplier)
  {
    keywords: [
      "DAY HOSPITAL",
      "DAYHOSPITAL"
    ],
    categoria: "Despesa Operacional – Day Hospital",
    ehOperacional: true
  },

  // 10. Despesa Operacional – Transferência para Conta com Titular Diferente
  {
    keywords: [
      "TRANSF VALOR P/ CONTA DIF TITULAR",
      "TRANSF VALOR P/ CONTA DE DIF TITULAR",
      "TRANSFERENCIA PARA CONTA DIF TITULAR",
      "TRANSFERÊNCIA PARA CONTA DIF TITULAR",
      "DIF TITULAR"
    ],
    categoria: "Despesa Operacional – Transferência Dif Titular",
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

const FIXED_EXPENSE_KEYWORDS = [
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
];

const BOLETO_SUPPLIER_KEYWORDS = [
  "BOLETO",
  "DUPLICATA",
  "FORNECEDOR"
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

const PIX_SENT_KEYWORDS = ["PIX ENVIADO"];

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
      // Excluir casos onde DAS é parte de nome de empresa como "CASA DAS CERAS"
      const dasRegex = /\b(DAS[\s\-]*(SIMPLES|NACIONAL|FEDERAL|TRIBUTO|IMPOSTO)|\bDAS\s*[\d]+|\bDAS\b(?=\s*$)|PAGAMENTO.*DAS|GUIA.*DAS)/i;
      const nomeEmpresaRegex = /\b(CASA|LOJA|CLINICA|FARMACIA|COMERCIO)\s+DAS\s+/i;
      
      if (dasRegex.test(historicoUpper) && !nomeEmpresaRegex.test(historicoUpper)) {
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
 * Função canônica oficial para classificação macro final.
 * Sempre considera o sinal do valor.
 */
export function classifyTransactionCanonical(
  historico: string,
  valor: number
): { categoria: MacroCategory; ehOperacional: boolean } {
  const historicoUpper = historico.toUpperCase();

  const isNonOperational =
    shouldIgnoreTransaction(historicoUpper) || detectFinancialMovement(historicoUpper);

  // Valor positivo: Receita (exceto não operacional)
  if (valor > 0) {
    if (isNonOperational) {
      return { categoria: "Movimentação Não Operacional", ehOperacional: false };
    }
    return { categoria: "Receita", ehOperacional: true };
  }

  // Valor negativo: ordem de prioridade obrigatória
  if (valor < 0) {
    if (isNonOperational) {
      return { categoria: "Movimentação Não Operacional", ehOperacional: false };
    }
    if (detectTax(historicoUpper)) {
      return { categoria: "Despesa – Impostos", ehOperacional: true };
    }
    if (detectSalaryByKeyword(historicoUpper)) {
      return { categoria: "Despesa – Folha de Pagamento", ehOperacional: true };
    }
    if (FIXED_EXPENSE_KEYWORDS.some((keyword) => historicoUpper.includes(keyword))) {
      return { categoria: "Despesa – Contas Fixas", ehOperacional: true };
    }
    if (PIX_SENT_KEYWORDS.some((keyword) => historicoUpper.includes(keyword))) {
      return { categoria: "PIX Enviado", ehOperacional: true };
    }
    if (
      BOLETO_SUPPLIER_KEYWORDS.some((keyword) => historicoUpper.includes(keyword)) ||
      checkSupplierList(historicoUpper)
    ) {
      return { categoria: "Despesa – Boletos/Fornecedores", ehOperacional: true };
    }
    return { categoria: "Despesa – Boletos/Fornecedores", ehOperacional: true };
  }

  // Valor zero: neutro / não classificado
  if (isNonOperational) {
    return { categoria: "Movimentação Não Operacional", ehOperacional: false };
  }
  return { categoria: "Não Classificado", ehOperacional: true };
}

function detectFixedExpense(historico: string): boolean {
  const historicoUpper = historico.toUpperCase();
  return FIXED_EXPENSE_KEYWORDS.some(keyword => historicoUpper.includes(keyword));
}

function detectPixSent(historico: string): boolean {
  return historico.toUpperCase().includes("PIX ENVIADO");
}

function detectBoletoOrSupplier(historico: string): boolean {
  const historicoUpper = historico.toUpperCase();
  return BOLETO_SUPPLIER_KEYWORDS.some(keyword => historicoUpper.includes(keyword));
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
 * Verifica se é um fornecedor de Day Hospital
 */
export function checkDayHospitalSupplier(historico: string): boolean {
  const historicoUpper = historico.toUpperCase();
  
  return DAY_HOSPITAL_SUPPLIERS.some(supplier => {
    const supplierUpper = supplier.toUpperCase();
    return historicoUpper.includes(supplierUpper);
  });
}

/**
 * Detecta fornecedor de boleto e retorna sua subcategoria
 */
export function detectBoletoSupplier(historico: string): { found: boolean; subcategoria?: string } {
  const historicoUpper = historico.toUpperCase();
  
  for (const supplier of BOLETO_SUPPLIERS) {
    const supplierUpper = supplier.nome.toUpperCase();
    if (historicoUpper.includes(supplierUpper)) {
      return { found: true, subcategoria: supplier.subcategoria };
    }
  }
  
  return { found: false };
}

export function normalizeCounterpartyName(name: string): string {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function extractPixRecipient(historico: string): string {
  const historicoUpper = historico.toUpperCase();
  const marker = "PIX ENVIADO";
  const pixIndex = historicoUpper.indexOf(marker);
  if (pixIndex < 0) return "";

  const rawRecipient = historico.substring(pixIndex + marker.length).trim();
  // Remove conectores comuns de layout bancário
  return rawRecipient
    .replace(/^[-:|/\\\s]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function findCounterpartyMatch(
  normalizedRecipient: string,
  counterparties: CounterpartyRecord[]
): CounterpartyRecord | undefined {
  if (!normalizedRecipient) return undefined;

  return counterparties.find((cp) => {
    if (!cp.ativo) return false;
    const aliasList = [cp.nome_normalizado, ...cp.aliases].map(normalizeCounterpartyName);
    return aliasList.some(alias => normalizedRecipient.includes(alias));
  });
}

export interface AnalyticalClassificationResult {
  categoriaOrigemExtrato: string;
  categoriaMacro: string;
  categoriaAnaliticaFinal: string;
  regraAplicada: string;
  confidenceScore: number;
  requiresReview: boolean;
  ehOperacional: boolean;
}

function mapAnalyticalToMacro(analytical: string): { categoriaMacro: string; ehOperacional: boolean } {
  if (analytical === ANALYTICAL_EXPENSE_CATEGORIES.FOLHA_RH) {
    return { categoriaMacro: "Despesa – Folha de Pagamento", ehOperacional: true };
  }

  if (analytical === ANALYTICAL_EXPENSE_CATEGORIES.TRANSFERENCIAS_INTERNAS) {
    return { categoriaMacro: "Movimentação Não Operacional", ehOperacional: false };
  }

  if (analytical === ANALYTICAL_EXPENSE_CATEGORIES.PIX_OUTROS_FORNECEDORES) {
    return { categoriaMacro: "PIX Enviado", ehOperacional: true };
  }

  return { categoriaMacro: "Despesa – Boletos/Fornecedores", ehOperacional: true };
}

export function classifyTransactionAnalytical(
  historico: string,
  valor: number,
  counterparties: CounterpartyRecord[] = DEFAULT_COUNTERPARTIES
): AnalyticalClassificationResult {
  const canonical = classifyTransactionCanonical(historico, valor);

  const defaultResult: AnalyticalClassificationResult = {
    categoriaOrigemExtrato: canonical.categoria,
    categoriaMacro: canonical.categoria,
    categoriaAnaliticaFinal: canonical.categoria,
    regraAplicada: "macro_canonical",
    confidenceScore: 0.8,
    requiresReview: false,
    ehOperacional: canonical.ehOperacional
  };

  const historicoUpper = historico.toUpperCase();
  const isPixSent = valor < 0 && historicoUpper.includes("PIX ENVIADO");
  if (!isPixSent) {
    return defaultResult;
  }

  const recipient = extractPixRecipient(historico);
  const normalizedRecipient = normalizeCounterpartyName(recipient);
  const match = findCounterpartyMatch(normalizedRecipient, counterparties);

  if (match) {
    const mapped = mapAnalyticalToMacro(match.categoria_analitica_final);
    return {
      categoriaOrigemExtrato: "PIX ENVIADO",
      categoriaMacro: mapped.categoriaMacro,
      categoriaAnaliticaFinal: match.categoria_analitica_final,
      regraAplicada: `pix_counterparty_match:${match.nome_normalizado}`,
      confidenceScore: 0.98,
      requiresReview: false,
      ehOperacional: mapped.ehOperacional
    };
  }

  const fallback = mapAnalyticalToMacro(ANALYTICAL_EXPENSE_CATEGORIES.PIX_OUTROS_FORNECEDORES);
  return {
    categoriaOrigemExtrato: "PIX ENVIADO",
    categoriaMacro: fallback.categoriaMacro,
    categoriaAnaliticaFinal: ANALYTICAL_EXPENSE_CATEGORIES.PIX_OUTROS_FORNECEDORES,
    regraAplicada: "pix_no_counterparty_match",
    confidenceScore: 0.6,
    requiresReview: true,
    ehOperacional: fallback.ehOperacional
  };
}

/**
 * Regras refinadas da Clínica Basile (prioridade alta para extrato Itaú PJ).
 */
function classifyBasileTransaction(historicoUpper: string): ClassificationResult | null {
  const byCategory: Array<{ categoria: string; ehOperacional: boolean; keywords: string[] }> = [
    {
      categoria: "Receitas",
      ehOperacional: true,
      keywords: ["PIX RECEBIDO", "PAGAMENTO CARTAO", "GETNET", "TRANSFERENCIA ENTRE CONTAS DE"]
    },
    {
      categoria: "Serviço de Anestesia",
      ehOperacional: true,
      keywords: ["JULIA GARCIA SILVESTRE", "THALES PEREIRA DE VASCONCELLOS", "FERNANDO SOUZA DE DEUS", "MAYARA MIRANDA DE OLIVEIRA"]
    },
    {
      categoria: "Manutenção",
      ehOperacional: true,
      keywords: ["JULIANO MARQUES LEONI", "VINICIUS EDSON PEREIRA"]
    },
    {
      categoria: "Financiamento / Empréstimo",
      ehOperacional: true,
      keywords: ["JUROS SALDO UTILIZ ATE LIMITE"]
    },
    {
      categoria: "Folha de Pagamento / RH",
      ehOperacional: true,
      keywords: ["TAR PAGTO SALARIO", "WIN ADMINISTRADORA", "SAQUE DINHEIRO", "CHEQUE EMITIDO"]
    },
    {
      categoria: "Insumos / Materiais Médicos",
      ehOperacional: true,
      keywords: ["SUPERMED", "ATIVA COMERCIAL", "HCENTER", "PRECISION COMERCIAL", "FRANCAMED", "HYGIBRAS", "BIOLINE", "PROLKORPUS", "RELOAD COMERCIO", "FORTECARE", "KVO MEDICAL", "MAZZEI COMERCIAL", "MEDICAL SALES", "HDL LOGISTICA", "CRISTALIA", "JP INDUSTRIA FARMACEUTICA", "ROGER COMERCIO", "SW SERVICOS MEDICINA", "BELGO ASSISTENCIA", "MEDICAR", "MADAH", "JOSE LUIZ SEIXAS", "MARIO OSAKABE", "SEGREDOS E INSPIRACOES", "AIR LIQUIDE", "CMF FUNDO", "MULTIPLO FIDC", "BANCO SOFISA", "DANUBIA"]
    },
    {
      categoria: "Impostos / Tributos",
      ehOperacional: true,
      keywords: ["DARF", "IOF", "MUNICIPIO DE RIBEIRAO PRETO"]
    },
    {
      categoria: "Tarifas / Encargos Bancários",
      ehOperacional: true,
      keywords: ["TARIFA MANUTENCAO CONTA", "TARIFA PIX RECEBIDO QR CHECKOUT", "TARIFA AVULSA ENVIO PIX", "TARIFA TRANSACAO COM CHEQUE", "TARIFA TRANSF RECURSO", "TARIFA MANUTENCAO PAGFOR", "TAR EMISSAO TED"]
    },
    {
      categoria: "Contabilidade / Assessoria",
      ehOperacional: true,
      keywords: ["CESAR CONTABILIDADE", "GESTAR ASSESSORIA", "GESTAO FINANCEIRAS"]
    },
    {
      categoria: "Serviços de Lavanderia",
      ehOperacional: true,
      keywords: ["LAVANDERIA ASPH", "LC FELTRIN LAVAGENS"]
    },
    {
      categoria: "Tecnologia / Sistemas",
      ehOperacional: true,
      keywords: ["RIBERMIDIA", "NOTA CONTROL", "BIONEXO", "GALVANI E BACHIM", "DIGITAL SYSTEM CERTIFICAD", "T.H.A. SCOTT ARMAZENAGEM", "PJBANK"]
    },
    {
      categoria: "Telefonia / Internet",
      ehOperacional: true,
      keywords: ["VIVO SP", "CLARO SA", "PGTO CONTA DE TELEFONE VIVO FIXO"]
    },
    { categoria: "Energia Elétrica", ehOperacional: true, keywords: ["CPFL CIA PAULISTA"] },
    { categoria: "Água / Esgoto", ehOperacional: true, keywords: ["SAERP RIBEIRAO PRETO"] },
    { categoria: "Seguros", ehOperacional: true, keywords: ["HDI SEGURADORA"] },
    { categoria: "Cartão Corporativo (fatura)", ehOperacional: true, keywords: ["DEBITO AUT. FATURA CARTAO VISA FINAL 2850"] },
    { categoria: "Marketing / Gráfica", ehOperacional: true, keywords: ["GRAFICA PERI", "REDE BRASIL RP"] },
    { categoria: "Alimentação / Copa", ehOperacional: true, keywords: ["FRUTPOP ALIMENTOS"] },
    { categoria: "Sindicato / Encargos Trabalhistas", ehOperacional: true, keywords: ["SIND EMP TURISMO E HOSP", "SIND EMPREG ESTAB SAUDE"] },
    { categoria: "Transporte / Logística", ehOperacional: true, keywords: ["OSTEL TRANSPORTES"] },
    {
      categoria: "Transferências Internas",
      ehOperacional: false,
      keywords: ["TRANSF VALOR P/ CONTA DIF TITULAR", "PIX ENVIADO CLINICA BASILE LTDA", "0257.01.043383-0", "3742.01.090085-5"]
    },
    { categoria: "Rendimentos (CDB/Conta)", ehOperacional: false, keywords: ["RENDIMENTO LIQUIDO DE CONTAMAX"] },
    {
      categoria: "PIX Enviado – Outros Fornecedores",
      ehOperacional: true,
      keywords: ["PIX ENVIADO", "CEF MATRIZ", "NILTON CESAR RODRIGUES", "SUMAYA SOUEN", "JONCIONE RIBEIRO", "LEONARDO ROSSI", "CILEUDA MARIA PAULA", "VICTOR HUGO ANDRADE", "MAURICIO FERNANDES", "JULIANA DE FAT"]
    }
  ];

  for (const rule of byCategory) {
    if (rule.keywords.some((keyword) => historicoUpper.includes(keyword))) {
      return { categoria: rule.categoria, ehOperacional: rule.ehOperacional };
    }
  }

  return null;
}

/**
 * Classifica uma transação bancária baseado no histórico
 * 
 * @param historico - O histórico da transação bancária
 * @returns Objeto com categoria e se é operacional
 */
export function classifyTransaction(historico: string): ClassificationResult {
  // Compatibilidade legada: sem valor, aplica fallback neutro
  return classifyTransactionCanonical(historico, 0);
}

/**
 * Interface para classificação aprendida (importada do schema)
 */
export interface LearnedClassification {
  id: string;
  historico: string;
  categoria: string;
  classificacaoFinal: string;
  ehOperacional: number; // 1 for true, 0 for false (database format)
  dataAprendizado: string;
  vezesAplicado: number;
  createdAt: Date | null;
  updatedAt: Date | null;
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
 * @param learnedClassifications - Lista opcional de classificações aprendidas
 * @returns Resultado completo da classificação avançada
 */
export function classifyTransactionAdvanced(
  historico: string,
  valor: number,
  data: string,
  funcionarios?: string[],
  fornecedores?: string[],
  learnedClassifications?: LearnedClassification[]
): AdvancedClassificationResult {
  const canonical = classifyTransactionCanonical(historico, valor);

  // Primeira verificação: transações a serem ignoradas
  if (shouldIgnoreTransaction(historico)) {
    return {
      categoria: canonical.categoria,
      ehOperacional: false,
      ehMovtoFinanceiro: false,
      ehImposto: false,
      ehSalarioPalavra: false,
      ehSalarioHeuristico: false,
      salarioConfirmado: false,
      classificacaoFinal: canonical.categoria,
      needsReview: false,
      confidenceScore: 1.0
    };
  }

  // Segunda verificação: APRENDIZADO - PRIORIDADE MÁXIMA
  if (learnedClassifications && learnedClassifications.length > 0) {
    const normalizedHistorico = historico.toLowerCase().trim();
    
    // Busca match exato primeiro
    const exactMatch = learnedClassifications.find(learned => 
      learned.historico.toLowerCase().trim() === normalizedHistorico
    );
    
    if (exactMatch) {
      return {
        categoria: canonical.categoria,
        ehOperacional: canonical.ehOperacional,
        ehMovtoFinanceiro: false, // Será definido baseado na categoria
        ehImposto: canonical.categoria === "Despesa – Impostos",
        ehSalarioPalavra: canonical.categoria === "Despesa – Folha de Pagamento",
        ehSalarioHeuristico: false,
        salarioConfirmado: canonical.categoria === "Despesa – Folha de Pagamento",
        classificacaoFinal: canonical.categoria,
        needsReview: false, // Aprendizado tem alta confiança
        confidenceScore: 0.98 // Muito alta confiança para aprendizado
      };
    }
    
    // TODO: Implementar busca fuzzy para similaridade alta (85%+)
    // Por enquanto apenas match exato
  }

  const ehMovtoFinanceiro = detectFinancialMovement(historico);
  const ehImposto = canonical.categoria === "Despesa – Impostos";
  const ehSalarioPalavra = canonical.categoria === "Despesa – Folha de Pagamento";
  const ehSalarioHeuristico = detectSalaryByHeuristic(historico, valor, data);
  
  // Verifica dicionários
  const ehFuncionario = checkEmployeeList(historico, funcionarios);
  const ehFornecedor = checkSupplierList(historico, fornecedores);
  const ehDayHospital = checkDayHospitalSupplier(historico);
  const boletoResult = detectBoletoSupplier(historico);

  // Inicia resultado base
  let categoria: string = canonical.categoria;
  let ehOperacional = canonical.ehOperacional;
  let classificacaoFinal: string = canonical.categoria;
  let needsReview = false;
  let salarioConfirmado = canonical.categoria === "Despesa – Folha de Pagamento";
  let subcategoriaBoleto: string | undefined;

  // LÓGICA DE PRIORIDADE

  // Camada advanced atua apenas como auditoria/sugestão.
  if (ehSalarioHeuristico && categoria !== "Despesa – Folha de Pagamento") {
    needsReview = true;
    classificacaoFinal = `${canonical.categoria} (auditoria: possível salário)`;
  }

  if (ehFornecedor && categoria === "Despesa – Boletos/Fornecedores") {
    classificacaoFinal = `${canonical.categoria} (auditoria: fornecedor confirmado)`;
  }

  if (ehDayHospital && categoria === "Despesa – Boletos/Fornecedores") {
    classificacaoFinal = `${canonical.categoria} (auditoria: day hospital)`;
  }

  if (boletoResult.found) {
    subcategoriaBoleto = boletoResult.subcategoria;
    classificacaoFinal = `${canonical.categoria} (auditoria: ${boletoResult.subcategoria})`;
  }

  // Calcula motivo da revisão baseado na lógica aplicada
  let reviewReason: string | undefined;
  if (needsReview) {
    if (ehSalarioHeuristico) {
      reviewReason = "PIX para pessoa física em período de pagamento - verificar se é salário";
    } else if (categoria === "PIX Enviado") {
      reviewReason = "PIX enviado sem classificação específica";
    } else if (categoria === "Não Classificado") {
      reviewReason = "Transação não classificada automaticamente";
    } else {
      reviewReason = "Transação marcada para revisão manual";
    }
  }

  // Calcula score de confiança baseado no tipo de classificação
  let confidenceScore = 1.0; // Default: máxima confiança
  
  if (categoria === "Movimentação Não Operacional" || ehMovtoFinanceiro) {
    confidenceScore = 0.95; // Alta confiança - padrões bem definidos
  } else if (ehImposto) {
    confidenceScore = 0.95; // Alta confiança - palavras-chave específicas
  } else if (ehSalarioPalavra || salarioConfirmado) {
    confidenceScore = 0.98; // Altíssima confiança - confirmação explícita
  } else if (ehFuncionario) {
    confidenceScore = 0.92; // Alta confiança - whitelist confirmada
  } else if (ehSalarioHeuristico) {
    confidenceScore = 0.75; // Confiança média - baseado em heurística
  } else if (ehDayHospital) {
    confidenceScore = 0.90; // Boa confiança - fornecedor de day hospital confirmado
  } else if (ehFornecedor) {
    confidenceScore = 0.88; // Boa confiança - whitelist fornecedores
  } else if (categoria === "Receita") {
    confidenceScore = 0.85; // Boa confiança - receitas geralmente bem identificadas
  } else if (categoria === "Não Classificado") {
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
    confidenceScore,
    subcategoriaBoleto
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
  return Object.values(MACRO_CATEGORIES);
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
