# Publicar a função segura de convite

No painel do Supabase, abra Edge Functions, crie a função `convidar-usuario` e
cole o conteúdo de `supabase/functions/convidar-usuario/index.ts`. Faça o deploy
com verificação de JWT habilitada. As variáveis `SUPABASE_URL`,
`SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas pelo Supabase.

Nunca coloque a Service Role no arquivo `.env` da aplicação ou no navegador.
