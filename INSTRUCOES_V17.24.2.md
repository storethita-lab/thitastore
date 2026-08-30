# THITA Store V17.24.2

Correção da mensagem tardia `Rascunho não encontrado ou já encerrado` exibida depois
de uma entrada concluída com sucesso.

## Publicação

Substitua os arquivos do repositório pelos desta versão e aguarde o deploy da Vercel.
O projeto está limpo na raiz, sem uma segunda pasta `thitastore` interna.

O SQL corretivo V17.24.1 já deve permanecer aplicado no Supabase. Esta correção
V17.24.2 é somente da interface e não exige outro SQL.

## Entrada que apresentou a mensagem

Não repita a entrada se o estoque já aumentou. A confirmação foi concluída; a mensagem
veio do salvamento automático antigo executado depois da conclusão.
