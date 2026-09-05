# THITA STORE V17.30

## Instalação

1. Confirme que os SQLs das versões anteriores, inclusive V17.29, já foram executados.
2. No Supabase, abra **SQL Editor** e crie uma nova consulta.
3. Copie todo o conteúdo de `V17.30_SQL_VENDEDORES_PARCELAS.sql` e execute uma única vez.
4. Publique o conteúdo da pasta `dist` no serviço usado atualmente.

## Primeira utilização

1. Entre em **Cadastros > Vendedores**.
2. Cadastre cada vendedor e informe sua comissão percentual.
3. Em uma nova venda, selecione obrigatoriamente o vendedor.
4. Para uma venda em crediário, escolha a quantidade e digite o valor de cada parcela.
5. A venda somente será concluída quando a soma das parcelas for exatamente igual ao total.

## Regras implementadas

- A comissão é calculada sobre o total final da venda, depois do desconto e com a entrega incluída.
- O percentual e o valor da comissão ficam gravados na venda; alterações futuras no cadastro do vendedor não mudam vendas antigas.
- O vendedor e os valores personalizados das parcelas ficam salvos no rascunho em nuvem.
- Vendedores com vendas registradas devem ser inativados, não excluídos.
- Este SQL é incremental e não apaga os dados existentes.
