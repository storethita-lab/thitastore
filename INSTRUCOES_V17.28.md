# THITA Store V17.28 — rascunho persistente da venda

1. Faça backup do banco e da versão publicada.
2. Execute `V17.28_SQL_RASCUNHO_VENDA.sql` inteiro no SQL Editor do Supabase.
3. Publique a pasta `dist` ou o projeto completo.
4. Abra Vendas, preencha alguns dados e aguarde **Salvo na nuvem**.
5. Troque de módulo e retorne; depois teste também atualizar a página.

O rascunho fica vinculado ao usuário e é recuperado em outros dispositivos. Ele só é removido após a conclusão transacional da venda ou pelo botão **Cancelar venda**. Enquanto for rascunho, não movimenta estoque.
