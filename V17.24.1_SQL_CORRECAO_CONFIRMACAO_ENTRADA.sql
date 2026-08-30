-- THITA Store V17.24.1
-- Correção da localização da entrada definitiva durante a confirmação.
-- Execute uma vez no SQL Editor do Supabase, após o V17.24.

begin;

create or replace function public.finalizar_rascunho_entrada_v17_24(p_entrada_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_e public.entradas;
  v_itens jsonb;
  v_subtotal numeric;
  v_total numeric;
  v_ids_anteriores uuid[];
  v_final_id uuid;
  v_soma_parcelas numeric;
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
         coalesce(sum(quantidade*custo_unitario),0)
    into v_itens,v_subtotal
    from public.entrada_rascunho_itens where entrada_id=p_entrada_id;
  if v_itens is null then raise exception 'Adicione pelo menos um item.'; end if;
  if v_e.desconto<0 or v_e.desconto>v_subtotal+v_e.frete then raise exception 'Desconto maior que o subtotal mais frete.'; end if;
  v_total:=greatest(0,v_subtotal+v_e.frete-v_e.desconto);

  -- Guarda os IDs existentes para identificar com precisão o registro criado
  -- pela rotina transacional, sem depender de comparação de horários.
  select coalesce(array_agg(id),'{}'::uuid[]) into v_ids_anteriores
    from public.entradas_mercadorias;

  perform public.registrar_entrada_v17_17(
    v_e.fornecedor_id,v_e.numero_documento,v_e.data_entrada,v_e.frete,v_e.observacoes,
    v_e.forma_pagamento,v_e.parcelas_pagamento,v_e.primeiro_vencimento,v_itens
  );

  select id into v_final_id from public.entradas_mercadorias
   where not (id=any(v_ids_anteriores))
     and fornecedor_id=v_e.fornecedor_id
     and numero_documento=v_e.numero_documento
   order by created_at desc limit 1 for update;
  if v_final_id is null then raise exception 'A entrada definitiva nao foi localizada; operacao revertida.'; end if;

  update public.entradas_mercadorias set desconto=v_e.desconto,total=v_total where id=v_final_id;

  select coalesce(sum(valor),0) into v_soma_parcelas
    from public.contas_pagar_v17_17 where entrada_id=v_final_id;
  if v_soma_parcelas>0 and v_soma_parcelas<>v_total then
    update public.contas_pagar_v17_17 set valor=round(v_total/parcelas_total,2) where entrada_id=v_final_id;
    update public.contas_pagar_v17_17
       set valor=valor+(v_total-(select sum(valor) from public.contas_pagar_v17_17 where entrada_id=v_final_id))
     where entrada_id=v_final_id
       and parcela_numero=(select max(parcela_numero) from public.contas_pagar_v17_17 where entrada_id=v_final_id);
  end if;

  update public.entradas set status='finalizada',finalizada_at=now(),updated_at=now() where id=p_entrada_id;
end $$;

revoke all on function public.finalizar_rascunho_entrada_v17_24(uuid) from public;
grant execute on function public.finalizar_rascunho_entrada_v17_24(uuid) to authenticated;

commit;
notify pgrst, 'reload schema';
