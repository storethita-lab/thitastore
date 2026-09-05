# THITA STORE V17.31

## Instalação

1. Confirme que o SQL V17.30 já foi executado.
2. Abra **SQL Editor** no Supabase.
3. Copie todo o conteúdo de `V17.31_SQL_RELATORIO_COMISSOES_TAXAS.sql` e execute uma vez.
4. Publique o conteúdo da pasta `dist`.

## Configuração das taxas

1. Acesse **Financeiros > Comissões e Taxas**.
2. Informe separadamente a taxa percentual do cartão de crédito e do cartão de débito.
3. Clique em **Salvar taxas**.

As taxas passam a valer para as vendas novas. Cada venda guarda o percentual e o valor da taxa aplicados no momento em que foi concluída.

## Comissões

- Em **Financeiros > Comissões e Taxas**, o sistema mostra quanto há para pagar a cada vendedor.
- É possível filtrar por vendedor, período e situação.
- Ao pagar uma comissão, clique em **Pagar** e informe a data.
- A comissão continua sendo calculada sobre o total final da venda.

## Relatório analítico

Em **Relatórios > Vendedores**, cada venda apresenta vendedor, cliente, pagamento, unidades, total, comissão, taxa administrativa e valor líquido. O relatório pode ser filtrado e exportado em CSV.

Este SQL é incremental e não apaga dados existentes.
