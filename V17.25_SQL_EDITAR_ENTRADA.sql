-- THITA Store V17.25 - reabrir entrada confirmada para edição
-- Execute depois do SQL V17.24.

begin;

create or replace function public.reabrir_entrada_para_edicao_v17_25(p_entrada_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_original record;
  v_rascunho public.entradas;
  v_itens jsonb;
  v_item jsonb;
begin
  if v_user is null then raise exception 'Usuario nao autenticado.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 1725));

  select e.* into v_original
    from public.entradas_mercadorias e
   where e.id=p_entrada_id and coalesce(e.status,'ativa')<>'cancelada'
   for update;
  if not found then raise exception 'Entrada nao encontrada ou ja cancelada.'; end if;

  select jsonb_agg(jsonb_build_object(
    'variante_id',r.variante_id,
    'quantidade',r.quantidade,
    'custo_unitario',r.custo_unitario
  )) into v_itens
    from public.relatorio_entradas_v17_11 r
   where r.entrada_id=p_entrada_id;
  if v_itens is null then raise exception 'Nao foi possivel recuperar os itens da entrada.'; end if;

  -- A rotina já existente estorna estoque, financeiro e contas a pagar.
  perform public.cancelar_entrada_v17_15(p_entrada_id,'Entrada reaberta para edição');

  select * into v_rascunho from public.entradas
   where usuario_id=v_user and status='rascunho' order by created_at limit 1 for update;
  if not found then
    insert into public.entradas(usuario_id) values(v_user) returning * into v_rascunho;
  else
    delete from public.entrada_rascunho_itens where entrada_id=v_rascunho.id;
  end if;

  update public.entradas set
    fornecedor_id=v_original.fornecedor_id,
    numero_documento=v_original.numero_documento,
    data_entrada=v_original.data_entrada,
    frete=coalesce(v_original.frete,0),
    desconto_nota=coalesce(v_original.desconto_nota,0),
    observacoes=v_original.observacoes,
    forma_pagamento=v_original.forma_pagamento,
    parcelas_pagamento=case when v_original.forma_pagamento='Cartão de Crédito'
      then least(12,greatest(coalesce(v_original.parcelas_pagamento,1),1)) else 1 end,
    primeiro_vencimento=case when v_original.forma_pagamento='Cartão de Crédito'
      then v_original.primeiro_vencimento else null end,
    updated_at=now()
  where id=v_rascunho.id;

  for v_item in select value from jsonb_array_elements(v_itens) loop
    insert into public.entrada_rascunho_itens(entrada_id,variante_id,quantidade,custo_unitario)
    values(v_rascunho.id,(v_item->>'variante_id')::uuid,(v_item->>'quantidade')::integer,(v_item->>'custo_unitario')::numeric);
  end loop;
  return v_rascunho.id;
end $$;

revoke all on function public.reabrir_entrada_para_edicao_v17_25(uuid) from public;
grant execute on function public.reabrir_entrada_para_edicao_v17_25(uuid) to authenticated;

commit;
