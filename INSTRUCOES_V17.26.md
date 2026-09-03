# THITA Store V17.26 — desconto geral na entrada

1. Faça backup do banco e da versão publicada.
2. Execute `V17.26_SQL_DESCONTO_GERAL_ENTRADA.sql` inteiro no SQL Editor do Supabase.
3. Publique a pasta `dist` ou o projeto completo da V17.26.
4. Abra Entrada de Mercadorias e confira a identificação `V17.26`.

O campo **Desconto da nota (R$)** agora aparece para qualquer forma de pagamento. O total é calculado como `subtotal + frete - desconto`. O desconto não pode ser negativo nem superar o valor bruto da nota e continua salvo no rascunho em nuvem.
