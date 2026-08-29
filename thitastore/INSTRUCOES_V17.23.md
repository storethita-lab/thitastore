# THITA Store V17.23 — instalação

1. Faça backup do banco e da versão atual do site.
2. No painel do Supabase, abra **SQL Editor**.
3. Execute todo o arquivo `V17.23_SQL_RASCUNHO_ENTRADA.sql` uma única vez.
4. Publique o conteúdo da pasta `dist` no mesmo serviço onde o THITA Store está hospedado. Se o seu serviço compila o projeto, publique o projeto completo e use `npm ci` seguido de `npm run build`.
5. Entre no sistema, abra **Entradas**, preencha alguns campos e espere aparecer **Salvo na nuvem**.
6. Atualize a página e confirme que os dados voltaram. Depois teste **Cancelar entrada** e uma entrada completa.

O SQL é incremental: não apaga entradas antigas e não exige executar novamente os scripts anteriores. Enquanto o registro estiver como `rascunho`, não existe alteração de estoque, movimentação, financeiro ou auditoria. A conclusão usa a função já existente `registrar_entrada_v17_17` dentro da mesma transação.

Se o SQL não tiver sido aplicado, a tela exibirá uma mensagem indicando que a função de rascunho ainda não existe. Nesse caso, aplique o passo 3 antes de usar a tela.
