# THITA Store V17.24 — instalação

1. Faça backup do banco e da versão publicada.
2. No Supabase, abra **SQL Editor**.
3. Execute o arquivo `V17.24_SQL_PARCELAMENTO_ENTRADA.sql` inteiro. Ele pode ser reaplicado com segurança caso uma tentativa anterior tenha sido interrompida.
4. Publique a pasta `dist` ou faça o deploy do projeto completo com `npm ci` e `npm run build`.
5. Abra **Entrada de mercadorias** e confirme que aparece `V17.24` ao lado do título.

Teste recomendado: escolha **Cartão de Crédito**, selecione 3x e confira o resumo; salve o rascunho, atualize a página e confirme a recuperação. Depois finalize uma nota cujo total tenha centavos e confira em **Contas a Pagar** se a última parcela absorveu a diferença. Também teste Pix e Transferência com desconto.

Este SQL é incremental, não apaga dados existentes e deve ser aplicado depois do SQL V17.23. Pix, Transferência, Débito e Boleto ficam em 1x. Somente Cartão de Crédito permite de 1x a 12x.
