# Validação crítica de produção pré-merge

## 1) Validação da classificação (crítico)

### 1.1 A função canônica considera sinal em todos os casos?
Sim, a canônica separa explicitamente `valor > 0`, `valor < 0` e `valor === 0`. Para positivo, retorna Receita exceto quando detecta não-operacional; para negativo aplica ordem de prioridade e fallback; para zero retorna não classificado/nao operacional. (`classifyTransactionCanonical`).

### 1.2 Existe fluxo onde positivo não vira Receita quando deveria?
Existe fluxo em que positivo **não** vira Receita por desenho (movimentação não operacional), que é correto.

### 1.3 Existe fluxo onde saída negativa não cai no fallback?
No canônico, toda saída negativa cai em alguma categoria (há fallback final em boletos/fornecedores).

### 1.4 Há sobrescrita de categoria após persistência?
No pipeline principal de relatórios, `annotateTransactions` mantém `categoria` persistida e só adiciona auditoria (`classificacaoFinal`). Ou seja, não sobrescreve categoria persistida.

## 2) Consistência entre camadas

### Resultado
**Há divergência real entre camadas (bloqueador).**

1. Upload/preview usa `normalizeTransactions -> classifyTransactionAnalytical` e grava `categoria` como `categoriaMacro`.
2. Exportação CSV (`exportExtratoPadronizado`) recalcula classificação via `classifyTransactionAdvanced` e publica `Classificacao_Auditoria` separado da `Classificacao_Final` (que continua `transaction.categoria`), sem usar `categoriaAnaliticaFinal` persistida.
3. Consolidação anual e relatórios por categoria continuam agregando por `transaction.categoria` (macro), não pela analítica final.

Conclusão: a mesma transação **não mantém uma única "categoria final"** em todos os pontos (macro/persistido x auditoria/export x analítica).

## 3) Risco nos dados históricos

1. Categorias antigas continuam ativas (campo principal `categoria` e filtros agregam por ele).
2. Consolidação anual mistura meses antigos/novos pela mesma chave textual de categoria.
3. `saved_monthly_reports` salva snapshots JSON com `ClassifiedTransaction[]`; pode coexistir com versões de schema diferentes.
4. `learned_classifications` existe, mas na função avançada um match exato retorna ainda o canônico, não a categoria aprendida efetiva.

### Classificação do risco
**ALTO** — risco de leitura inconsistente e comparação histórica distorcida por mistura de semântica macro vs analítica.

## 4) Validação do pipeline de importação

Fluxo verificado: upload → parse → normalize → classify → persist.

1. Perda de dados: linhas inválidas são descartadas por design (com warning), então há perda controlada.
2. Duplicidade parser/normalizador: há duplicidade leve em normalização de campos (esperada).
3. Deduplicação: continua funcionando por assinatura de data+histórico+documento+valor+mês/ano.
4. Mês/ano: pode errar em extratos multi-mês (usa predominância, se habilitado), com risco de interpretação incorreta.

## 5) Regras de negócio (gastos)

- PIX salário vs PIX serviço: **FUNCIONA PARCIALMENTE** (apenas se nome estiver no dicionário/aliases).
- Boleto fornecedor vs boleto imposto: **FUNCIONA PARCIALMENTE** (imposto por palavra-chave; depende do texto).
- Saque/cheque como folha: **NÃO FUNCIONA** no pipeline principal analítico (regra existe em função não integrada).
- Tarifa bancária vs receita: **FUNCIONA PARCIALMENTE** (negativo tende a despesa; positivo pode virar receita por sinal).
- Transferência interna vs fornecedor: **FUNCIONA PARCIALMENTE** (boa cobertura por padrões + contraparte clínica, mas dependente de texto).

## 6) Validação dos testes

1. Cobrem principalmente técnica/unitária, pouco cenário fim-a-fim com import/export/histórico.
2. Cenários críticos não testados: consistência preview x DB x export x anual; multi-mês; retrocompatibilidade de snapshots.
3. Possível falso positivo: testes de PIX passam com aliases específicos, mas não validam variações reais de descrição bancária.

## 7) Top 5 riscos reais pós-merge

1. Inconsistência de categoria final entre preview, persistência e export.
2. Consolidação anual continuar macro enquanto operação migra para analítico.
3. Relatórios salvos misturarem semânticas entre versões.
4. Regras de PIX dependerem de string/alias e gerarem classificação incorreta silenciosa.
5. Reclassificação aprendida não alterar efetivamente categoria no fluxo avançado.

## 8) Decisão final

**MERGE: NÃO APROVADO**

### Bloqueador principal
Inconsistência de categoria final entre camadas (preview/persistência/export/consolidação), com risco de distorção financeira em análise e tomada de decisão.

## 9) Checklist final para execução manual

Usar 1 extrato real contendo: PIX enviado (RH + anestesia + manutenção + desconhecido), boleto imposto, tarifa, transferência interna.

1. Processar upload e registrar totais:
   - total bruto, total processado, entradas, saídas.
2. Conferir 10 transações amostra no preview:
   - `categoria`, `categoriaMacro`, `categoriaAnaliticaFinal`, `regraAplicada`, `requiresReview`.
3. Salvar no banco e consultar histórico:
   - confirmar campos persistidos idênticos ao preview.
4. Exportar extrato CSV e comparar linha a linha:
   - categoria final exibida vs categoria analítica persistida.
5. Rodar consolidação anual do mesmo mês:
   - comparar gasto/folha/impostos com relatório mensal salvo.
6. Validar fila de revisão:
   - PIX sem match deve aparecer para revisão.
7. Validar reconciliação financeira:
   - entradas - saídas = saldo líquido; sem diferença > R$ 0,01.
