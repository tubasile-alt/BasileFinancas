# Gap Analysis — Migração de 8 macros para 21 categorias analíticas de gasto

## Objetivo alvo
Migrar o foco da classificação macro (8 grupos) para classificação analítica final de gasto (21 categorias), com trilha completa de origem e fila de revisão para não mapeados.

## A) O que da implementação atual ainda serve

1. Pipeline de ingestão e normalização já existe e está estável para CSV/XLSX/OFX/PDF, com data/valor/histórico padronizados.
2. Há uma classificação canônica macro com precedência e testes automatizados, útil como camada de fallback/triagem inicial.
3. Existe classificação avançada com flags úteis (imposto, salário por palavra, salário heurístico, movimentação financeira).
4. Já existem dicionários de funcionários e fornecedores (UI + carregamento de `/api/employees` e tentativa de `/api/suppliers`) para reforçar matching.
5. Já existe fila de revisão no resumo avançado (`needsReview` + `filaRevisao`), com ações de reclassificação manual na tela.
6. Já existe tabela de `learned_classifications`, que pode ser reaproveitada para aprendizado incremental de regras.

## B) O que está insuficiente para o modelo analítico

1. O núcleo ainda é macro-first: `classifyTransactionCanonical` fecha em 8 categorias e o restante funciona como auditoria/sugestão, não como categoria analítica final persistida.
2. O modelo persistente (`bank_transactions`) guarda apenas `categoria` e `ehOperacional`; não guarda `categoria_origem_extrato`, `categoria_macro` e `categoria_analitica_final` separadas.
3. Não há campo estruturado de contraparte (funcionário/fornecedor/destinatário) no schema de transação; tudo depende de substring em `historico`.
4. O endpoint `/api/suppliers` é consumido no front, mas não existe no backend atual, o que inviabiliza matching consistente por fornecedor no fluxo padrão.
5. Reclassificação de PIX enviado está incompleta: hoje vira macro `PIX Enviado` e só ganha anotação textual de auditoria, sem mudança definitiva para natureza real.
6. Reclassificação de boletos existe apenas parcialmente (subcategoria boleto em memória), sem tabela mestre versionada fornecedor→natureza analítica.
7. Regras especiais citadas (cartão corporativo, empréstimo, contabilidade, anestesia, lavanderia, tecnologia, manutenção, insumos médicos etc.) aparecem em função refinada (`classifyBasileTransaction`), mas ela não está integrada ao pipeline principal.
8. Saques e cheques como folha não têm confirmação robusta por evidência (beneficiário + janela + dicionário + aprovação); hoje a confirmação é limitada.
9. A fila de revisão existe, mas sem persistência dedicada, sem SLA/status/owner e sem ciclo completo de resolução e reaprendizado estruturado.

## C) O que precisa ser criado obrigatoriamente

1. **Novo modelo de classificação em 3 níveis por transação**:
   - `categoria_origem_extrato` (literal do banco/método detectado)
   - `categoria_macro` (8 grupos, para comparabilidade histórica)
   - `categoria_analitica_final` (21 categorias de despesa)
2. **Camada de contraparte estruturada**:
   - extração e persistência de `contraparte_nome`, `contraparte_documento` (quando existir), `tipo_contraparte` (funcionário/fornecedor/pf/pj/indefinido).
3. **Tabela de mapeamento versionada** (`supplier_name -> analytical_category`, com prioridade, confiança, vigência, origem da regra).
4. **Motor de regras analíticas determinístico** com ordem de precedência explícita para:
   - PIX enviado por destinatário
   - boletos por fornecedor/natureza
   - saques/cheques confirmados como folha
   - regras especiais (impostos via boleto, tarifas, cartão corporativo, empréstimo, contabilidade, anestesia, lavanderia, tecnologia, manutenção, insumos médicos).
5. **Persistência de fila de revisão** (`review_queue`) com status (`novo`, `em_analise`, `resolvido`), motivo padronizado, usuário responsável e timestamp.
6. **Fluxo de feedback**: decisão manual alimenta tabela de regras aprendidas/mapeamento (não apenas texto de auditoria).
7. **API e UI para dicionários reais**: implementar backend de fornecedores e conectar CRUD com a UI já existente.
8. **Contrato de export** contemplando as 3 categorias e identificadores de regra aplicada (auditabilidade).

## D) Plano técnico de migração (8 -> 21)

### Fase 1 — Fundação de dados
1. Criar migração de banco para novos campos em `bank_transactions` e nova tabela `review_queue`.
2. Criar tabela `suppliers` e `analytical_category_mappings` com versionamento/prioridade.
3. Definir enum/catálogo oficial das 21 categorias analíticas e tabela de referência.

### Fase 2 — Novo motor de classificação
1. Refatorar classificação para pipeline em estágios:
   - `classificar_origem_extrato`
   - `classificar_macro`
   - `classificar_analitico`
2. Promover `classifyBasileTransaction` (ou substituir) para o pipeline oficial com testes.
3. Adicionar “motivo da decisão” + “regra aplicada” por transação para auditoria.

### Fase 3 — Regras críticas do domínio
1. PIX enviado: resolver por contraparte (funcionário/fornecedor/destinatário) e natureza real.
2. Boleto: resolver por fornecedor + chave semântica de natureza (incluindo impostos via boleto).
3. Saque/cheque: confirmação de folha com score + revisão obrigatória quando ambíguo.
4. Ativar regras especiais prioritárias pedidas no escopo.

### Fase 4 — Revisão operacional e aprendizado
1. Persistir fila de revisão e integrar ações da UI diretamente ao backend.
2. Ao resolver item, gravar decisão como mapeamento/rule learning reutilizável.
3. Medir KPIs de qualidade: `% não mapeado`, `% revisão`, precisão por categoria.

### Fase 5 — Migração histórica e cutover
1. Backfill dos últimos meses: recalcular transações antigas com o novo motor.
2. Rodar comparativo macro vs analítico (antes/depois) para validação.
3. Publicar versão com feature flag e depois tornar padrão o analítico (macro fica como visão derivada).

## Riscos técnicos principais
1. Ambiguidade de descrição bancária sem contraparte estruturada.
2. Dependência de dicionário incompleto (fornecedores/funcionários) na fase inicial.
3. Regressão de relatórios atuais se não houver camada de compatibilidade macro.

## Definição mínima de pronto (MVP analítico)
1. Toda despesa persistida com `macro + analítica + origem`.
2. PIX/boletos/saque/cheque com regras de reclassificação ativas.
3. Fila de revisão persistida para não mapeados.
4. Export e dashboards já filtrando por categoria analítica final.
