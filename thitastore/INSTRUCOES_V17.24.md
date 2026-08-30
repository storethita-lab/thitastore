# THITA Store V17.24

## SQL obrigatório

No Supabase, abra **SQL Editor > New query**, copie todo o conteúdo de
`V17.24_SQL_TAMANHO_UNICO_DESCONTO_ENTRADA.sql` e execute uma única vez.

Ordem esperada para uma base ainda não atualizada:

1. Execute primeiro `V17.23_SQL_RASCUNHO_ENTRADA.sql` (presente na pasta `thitastore`).
2. Execute depois `V17.24_SQL_TAMANHO_UNICO_DESCONTO_ENTRADA.sql`.
3. Publique a nova pasta `dist` ou faça o deploy normal do projeto.

Se o V17.23 já foi aplicado, execute somente o V17.24.

## O que mudou

- Tamanho `Único` no cadastro e na edição de produtos.
- Ordenação lógica dos tamanhos no cadastro, listas, Entrada/NF e catálogo.
- Campo de desconto visível apenas para Pix e Transferência.
- Trocar para outra forma de pagamento zera e oculta o desconto.
- Total da nota: subtotal dos itens + frete - desconto, nunca negativo.
- Forma de pagamento e desconto persistem no rascunho do Supabase.
- Validação do desconto também ocorre dentro da transação no banco.
- Entrada final, total financeiro e eventuais parcelas permanecem coerentes.
- Forma de pagamento e desconto aparecem nas entradas recentes.

## Observação

Não execute `npm audit fix --force`: ele pode trocar versões principais. As versões
usadas no build permanecem fixadas pelo `package-lock.json` original.
