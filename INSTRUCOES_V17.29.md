# THITA STORE V17.29

## Antes de publicar

1. Abra o Supabase do sistema.
2. Entre em **SQL Editor** e crie uma nova consulta.
3. Copie todo o conteúdo de `V17.29_SQL_RECEBIMENTO_CREDIARIO.sql`.
4. Execute o SQL uma única vez e confirme que terminou sem erro.
5. Publique o conteúdo da pasta `dist` no mesmo serviço usado atualmente.

## O que mudou

- Relatórios de saídas exibem o desconto de cada venda.
- O histórico do cliente soma vendas, unidades, total vendido e descontos concedidos dentro dos filtros escolhidos.
- Produtos sem estoque e tamanhos zerados não aparecem no catálogo.
- A tecla Enter não conclui mais uma venda; somente o botão **Concluir venda** faz isso.
- O botão **Receber** do crediário abre uma confirmação com valor recebido e data do recebimento.
- Ao desfazer o pagamento, o valor original da parcela é restaurado.

## Observação

O SQL desta versão é incremental: não apaga dados nem substitui os SQLs das versões anteriores.
