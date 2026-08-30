-- THITA Store V17.24 - tamanho Único e desconto em entradas Pix/Transferência
-- Execute uma vez no SQL Editor do Supabase, após o V17.23.

begin;

alter table public.entradas
  add column if not exists desconto numeric(14,2) not null default 0;
alter table public.entradas_mercadorias
  add column if not exists desconto numeric(14,2) not null default 0;

alter table public.entradas drop constraint if exists entradas_desconto_valido;
alter table public.entradas add constraint entradas_desconto_valido check (desconto >= 0);
alter table public.entradas_mercadorias drop constraint if exists entradas_mercadorias_desconto_valido;
alter table public.entradas_mercadorias add constraint entradas_mercadorias_desconto_valido check (desconto >= 0 and total >= 0);

create or replace function public.salvar_rascunho_entrada_v17_24(
  p_entrada_id uuid, p_fornecedor_id uuid, p_numero_documento text, p_data_entrada date,
  p_frete numeric, p_desconto numeric, p_observacoes text, p_forma_pagamento text,
  p_parcelas_pagamento integer, p_primeiro_vencimento date, p_itens jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_item jsonb; v_subtotal numeric:=0; v_desconto numeric:=coalesce(p_desconto,0);
begin
  if v_user is null then raise exception 'Usuario nao autenticado.'; end if;
  if jsonb_typeof(coalesce(p_itens,'[]'::jsonb))<>'array' then raise exception 'Lista de itens invalida.'; end if;
  select coalesce(sum((x->>'quantidade')::integer*(x->>'custo_unitario')::numeric),0)
    into v_subtotal from jsonb_array_elements(coalesce(p_itens,'[]'::jsonb)) x;
  if coalesce(p_forma_pagamento,'') not in ('Pix','Transferência') then v_desconto:=0; end if;
  if v_desconto<0 or v_desconto>v_subtotal+greatest(coalesce(p_frete,0),0) then
    raise exception 'O desconto deve estar entre zero e o subtotal mais frete.';
  end if;
  update public.entradas set fornecedor_id=p_fornecedor_id,numero_documento=nullif(btrim(p_numero_documento),''),
    data_entrada=coalesce(p_data_entrada,current_date),frete=greatest(coalesce(p_frete,0),0),desconto=v_desconto,
    observacoes=nullif(btrim(p_observacoes),''),forma_pagamento=nullif(btrim(p_forma_pagamento),''),
    parcelas_pagamento=greatest(coalesce(p_parcelas_pagamento,1),1),primeiro_vencimento=p_primeiro_vencimento,updated_at=now()
  where id=p_entrada_id and usuario_id=v_user and status='rascunho';
  if not found then raise exception 'Rascunho nao encontrado ou ja encerrado.'; end if;
  delete from public.entrada_rascunho_itens where entrada_id=p_entrada_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_itens,'[]'::jsonb)) loop
    if coalesce((v_item->>'quantidade')::integer,0)<=0 or coalesce((v_item->>'custo_unitario')::numeric,-1)<0 then raise exception 'Quantidade ou custo invalido.'; end if;
    insert into public.entrada_rascunho_itens(entrada_id,variante_id,quantidade,custo_unitario)
    values(p_entrada_id,(v_item->>'variante_id')::uuid,(v_item->>'quantidade')::integer,(v_item->>'custo_unitario')::numeric);
  end loop;
  return jsonb_build_object('id',p_entrada_id,'saved_at',now());
end $$;

create or replace function public.finalizar_rascunho_entrada_v17_24(p_entrada_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_e public.entradas; v_itens jsonb; v_subtotal numeric; v_total numeric; v_ids_anteriores uuid[]; v_final_id uuid; v_soma_parcelas numeric;
begin
  if auth.uid() is null then raise exception 'Usuario nao autenticado.'; end if;
  select * into v_e from public.entradas where id=p_entrada_id and usuario_id=auth.uid() for update;
  if not found or v_e.status<>'rascunho' then raise exception 'Rascunho nao encontrado ou ja encerrado.'; end if;
  if v_e.fornecedor_id is null then raise exception 'Selecione o fornecedor.'; end if;
  if nullif(btrim(v_e.numero_documento),'') is null then raise exception 'Informe o numero da nota/documento.'; end if;
  if nullif(btrim(v_e.forma_pagamento),'') is null then raise exception 'Selecione a forma de pagamento.'; end if;
  if v_e.forma_pagamento not in ('Pix','Transferência') and v_e.desconto<>0 then raise exception 'Desconto permitido somente para Pix ou Transferência.'; end if;
  if v_e.forma_pagamento in ('Cartão de Crédito','Boleto') and v_e.primeiro_vencimento is null then raise exception 'Informe o primeiro vencimento.'; end if;
  select jsonb_agg(jsonb_build_object('variante_id',variante_id,'quantidade',quantidade,'custo_unitario',custo_unitario)),
         coalesce(sum(quantidade*custo_unitario),0) into v_itens,v_subtotal
    from public.entrada_rascunho_itens where entrada_id=p_entrada_id;
  if v_itens is null then raise exception 'Adicione pelo menos um item.'; end if;
  if v_e.desconto<0 or v_e.desconto>v_subtotal+v_e.frete then raise exception 'Desconto maior que o subtotal mais frete.'; end if;
  v_total:=greatest(0,v_subtotal+v_e.frete-v_e.desconto);

  select coalesce(array_agg(id),'{}'::uuid[]) into v_ids_anteriores from public.entradas_mercadorias;
  perform public.registrar_entrada_v17_17(v_e.fornecedor_id,v_e.numero_documento,v_e.data_entrada,v_e.frete,v_e.observacoes,v_e.forma_pagamento,v_e.parcelas_pagamento,v_e.primeiro_vencimento,v_itens);
  select id into v_final_id from public.entradas_mercadorias
   where not (id=any(v_ids_anteriores)) and fornecedor_id=v_e.fornecedor_id and numero_documento=v_e.numero_documento
   order by created_at desc limit 1 for update;
  if v_final_id is null then raise exception 'A entrada definitiva nao foi localizada; operacao revertida.'; end if;
  update public.entradas_mercadorias set desconto=v_e.desconto,total=v_total where id=v_final_id;

  -- Mantém eventuais parcelas criadas pela rotina V17.17 coerentes com o total líquido.
  select coalesce(sum(valor),0) into v_soma_parcelas from public.contas_pagar_v17_17 where entrada_id=v_final_id;
  if v_soma_parcelas>0 and v_soma_parcelas<>v_total then
    update public.contas_pagar_v17_17 set valor=round(v_total/parcelas_total,2) where entrada_id=v_final_id;
    update public.contas_pagar_v17_17 set valor=valor+(v_total-(select sum(valor) from public.contas_pagar_v17_17 where entrada_id=v_final_id))
     where entrada_id=v_final_id and parcela_numero=(select max(parcela_numero) from public.contas_pagar_v17_17 where entrada_id=v_final_id);
  end if;
  update public.entradas set status='finalizada',finalizada_at=now(),updated_at=now() where id=p_entrada_id;
end $$;

revoke all on function public.salvar_rascunho_entrada_v17_24(uuid,uuid,text,date,numeric,numeric,text,text,integer,date,jsonb) from public;
revoke all on function public.finalizar_rascunho_entrada_v17_24(uuid) from public;
grant execute on function public.salvar_rascunho_entrada_v17_24(uuid,uuid,text,date,numeric,numeric,text,text,integer,date,jsonb) to authenticated;
grant execute on function public.finalizar_rascunho_entrada_v17_24(uuid) to authenticated;

commit;
