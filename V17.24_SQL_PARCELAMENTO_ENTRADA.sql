-- THITA Store V17.24
-- Parcelamento de cartão de crédito (1x a 12x), desconto de Pix/Transferência
-- e persistência dos novos campos no rascunho.
-- Execute depois do V17.23_SQL_RASCUNHO_ENTRADA.sql.

begin;

alter table public.entradas
  add column if not exists desconto_nota numeric(14,2) not null default 0;

alter table public.entradas_mercadorias
  add column if not exists desconto_nota numeric(14,2) not null default 0;

create or replace function public.obter_rascunho_entrada_v17_24()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_entrada public.entradas; v_result jsonb;
begin
  if v_user is null then raise exception 'Usuario nao autenticado.'; end if;
  select * into v_entrada from public.entradas
   where usuario_id=v_user and status='rascunho' order by created_at limit 1;
  if not found then
    begin
      insert into public.entradas(usuario_id) values(v_user) returning * into v_entrada;
    exception when unique_violation then
      select * into v_entrada from public.entradas
       where usuario_id=v_user and status='rascunho' order by created_at limit 1;
    end;
  end if;
  select to_jsonb(v_entrada) || jsonb_build_object('itens',coalesce(jsonb_agg(
    jsonb_build_object('variante_id',i.variante_id,'quantidade',i.quantidade,'custo_unitario',i.custo_unitario)
    order by i.created_at) filter(where i.id is not null),'[]'::jsonb)) into v_result
  from public.entrada_rascunho_itens i where i.entrada_id=v_entrada.id;
  return v_result;
end $$;

create or replace function public.salvar_rascunho_entrada_v17_24(
  p_entrada_id uuid, p_fornecedor_id uuid, p_numero_documento text, p_data_entrada date,
  p_frete numeric, p_desconto_nota numeric, p_observacoes text, p_forma_pagamento text,
  p_parcelas_pagamento integer, p_primeiro_vencimento date, p_itens jsonb
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_item jsonb; v_forma text := nullif(btrim(p_forma_pagamento),'');
begin
  if v_user is null then raise exception 'Usuario nao autenticado.'; end if;
  if jsonb_typeof(coalesce(p_itens,'[]'::jsonb)) <> 'array' then raise exception 'Lista de itens invalida.'; end if;
  if coalesce(p_frete,0)<0 then raise exception 'Frete invalido.'; end if;
  if coalesce(p_desconto_nota,0)<0 then raise exception 'Desconto invalido.'; end if;
  update public.entradas set fornecedor_id=p_fornecedor_id,
    numero_documento=nullif(btrim(p_numero_documento),''),data_entrada=coalesce(p_data_entrada,current_date),
    frete=coalesce(p_frete,0),desconto_nota=case when v_forma in ('Pix','Transferência') then coalesce(p_desconto_nota,0) else 0 end,
    observacoes=nullif(btrim(p_observacoes),''),forma_pagamento=v_forma,
    parcelas_pagamento=case when v_forma='Cartão de Crédito' then least(12,greatest(coalesce(p_parcelas_pagamento,1),1)) else 1 end,
    primeiro_vencimento=case when v_forma='Cartão de Crédito' then p_primeiro_vencimento else null end,updated_at=now()
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
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_e public.entradas; v_itens jsonb; v_subtotal numeric(14,2); v_total numeric(14,2);
  v_entrada_final uuid; v_base numeric(14,2); v_qtd integer;
begin
  if auth.uid() is null then raise exception 'Usuario nao autenticado.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1724));
  select * into v_e from public.entradas where id=p_entrada_id and usuario_id=auth.uid() for update;
  if not found or v_e.status<>'rascunho' then raise exception 'Rascunho nao encontrado ou ja encerrado.'; end if;
  if v_e.fornecedor_id is null then raise exception 'Selecione o fornecedor.'; end if;
  if nullif(btrim(v_e.numero_documento),'') is null then raise exception 'Informe o numero da nota/documento.'; end if;
  if v_e.forma_pagamento not in ('Pix','Transferência','Cartão de Débito','Cartão de Crédito','Boleto') then raise exception 'Selecione uma forma de pagamento valida.'; end if;
  if v_e.forma_pagamento='Cartão de Crédito' and v_e.primeiro_vencimento is null then raise exception 'Informe o primeiro vencimento.'; end if;
  if v_e.forma_pagamento='Cartão de Crédito' and v_e.parcelas_pagamento not between 1 and 12 then raise exception 'Cartao de credito permite de 1 a 12 parcelas.'; end if;
  if v_e.forma_pagamento<>'Cartão de Crédito' and v_e.parcelas_pagamento<>1 then raise exception 'Esta forma de pagamento aceita somente 1 parcela.'; end if;
  select coalesce(sum(quantidade*custo_unitario),0),jsonb_agg(jsonb_build_object('variante_id',variante_id,'quantidade',quantidade,'custo_unitario',custo_unitario))
    into v_subtotal,v_itens from public.entrada_rascunho_itens where entrada_id=p_entrada_id;
  if v_itens is null then raise exception 'Adicione pelo menos um item.'; end if;
  if v_e.forma_pagamento not in ('Pix','Transferência') and v_e.desconto_nota<>0 then raise exception 'Desconto permitido somente para Pix ou Transferencia.'; end if;
  if v_e.desconto_nota<0 or v_e.desconto_nota>v_subtotal+v_e.frete then raise exception 'Desconto maior que o total da nota.'; end if;
  v_total:=round(v_subtotal+v_e.frete-v_e.desconto_nota,2);

  perform public.registrar_entrada_v17_17(v_e.fornecedor_id,v_e.numero_documento,v_e.data_entrada,v_e.frete,v_e.observacoes,v_e.forma_pagamento,v_e.parcelas_pagamento,v_e.primeiro_vencimento,v_itens);
  select id into v_entrada_final from public.entradas_mercadorias
   where fornecedor_id=v_e.fornecedor_id and numero_documento=v_e.numero_documento
   order by created_at desc limit 1;
  if v_entrada_final is null then raise exception 'Nao foi possivel localizar a entrada finalizada.'; end if;
  update public.entradas_mercadorias set desconto_nota=v_e.desconto_nota,total=v_total where id=v_entrada_final;

  -- A última parcela absorve os centavos restantes; a soma sempre fecha o total.
  if to_regclass('public.contas_pagar_v17_17') is not null then
    select count(*) into v_qtd from public.contas_pagar_v17_17 where entrada_id=v_entrada_final;
    if v_qtd>0 then
      v_base:=trunc((v_total*100)/v_qtd)/100;
      update public.contas_pagar_v17_17 set valor=case when parcela_numero=v_qtd then v_total-v_base*(v_qtd-1) else v_base end
       where entrada_id=v_entrada_final;
    end if;
  end if;
  update public.entradas set status='finalizada',finalizada_at=now(),updated_at=now() where id=p_entrada_id;
end $$;

revoke all on function public.obter_rascunho_entrada_v17_24() from public;
revoke all on function public.salvar_rascunho_entrada_v17_24(uuid,uuid,text,date,numeric,numeric,text,text,integer,date,jsonb) from public;
revoke all on function public.finalizar_rascunho_entrada_v17_24(uuid) from public;
grant execute on function public.obter_rascunho_entrada_v17_24() to authenticated;
grant execute on function public.salvar_rascunho_entrada_v17_24(uuid,uuid,text,date,numeric,numeric,text,text,integer,date,jsonb) to authenticated;
grant execute on function public.finalizar_rascunho_entrada_v17_24(uuid) to authenticated;

commit;
