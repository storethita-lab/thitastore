-- THITA Store V17.25
-- Autosave sempre pelo rascunho atual do usuário, sem receber ID da tela.

begin;

create or replace function public.salvar_rascunho_atual_entrada_v17_25(
  p_fornecedor_id uuid, p_numero_documento text, p_data_entrada date,
  p_frete numeric, p_desconto numeric, p_observacoes text, p_forma_pagamento text,
  p_parcelas_pagamento integer, p_primeiro_vencimento date, p_itens jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_user uuid:=auth.uid();
  v_entrada_id uuid;
  v_item jsonb;
  v_subtotal numeric:=0;
  v_desconto numeric:=coalesce(p_desconto,0);
begin
  if v_user is null then raise exception 'Usuario nao autenticado.'; end if;
  if jsonb_typeof(coalesce(p_itens,'[]'::jsonb))<>'array' then raise exception 'Lista de itens invalida.'; end if;

  select id into v_entrada_id from public.entradas
   where usuario_id=v_user and status='rascunho'
   order by created_at limit 1 for update;
  if v_entrada_id is null then
    begin
      insert into public.entradas(usuario_id) values(v_user) returning id into v_entrada_id;
    exception when unique_violation then
      select id into v_entrada_id from public.entradas
       where usuario_id=v_user and status='rascunho'
       order by created_at limit 1 for update;
    end;
  end if;
  if v_entrada_id is null then raise exception 'Nao foi possivel localizar ou criar o rascunho atual.'; end if;

  select coalesce(sum((x->>'quantidade')::integer*(x->>'custo_unitario')::numeric),0)
    into v_subtotal from jsonb_array_elements(coalesce(p_itens,'[]'::jsonb)) x;
  if coalesce(p_forma_pagamento,'') not in ('Pix','Transferência') then v_desconto:=0; end if;
  if v_desconto<0 or v_desconto>v_subtotal+greatest(coalesce(p_frete,0),0) then
    raise exception 'O desconto deve estar entre zero e o subtotal mais frete.';
  end if;

  update public.entradas set
    fornecedor_id=p_fornecedor_id,numero_documento=nullif(btrim(p_numero_documento),''),
    data_entrada=coalesce(p_data_entrada,current_date),frete=greatest(coalesce(p_frete,0),0),
    desconto=v_desconto,observacoes=nullif(btrim(p_observacoes),''),
    forma_pagamento=nullif(btrim(p_forma_pagamento),''),
    parcelas_pagamento=greatest(coalesce(p_parcelas_pagamento,1),1),
    primeiro_vencimento=p_primeiro_vencimento,updated_at=now()
  where id=v_entrada_id and usuario_id=v_user and status='rascunho';

  delete from public.entrada_rascunho_itens where entrada_id=v_entrada_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_itens,'[]'::jsonb)) loop
    if coalesce((v_item->>'quantidade')::integer,0)<=0
       or coalesce((v_item->>'custo_unitario')::numeric,-1)<0 then
      raise exception 'Quantidade ou custo invalido.';
    end if;
    insert into public.entrada_rascunho_itens(entrada_id,variante_id,quantidade,custo_unitario)
    values(v_entrada_id,(v_item->>'variante_id')::uuid,
           (v_item->>'quantidade')::integer,(v_item->>'custo_unitario')::numeric);
  end loop;
  return jsonb_build_object('id',v_entrada_id,'saved_at',now());
end $$;

revoke all on function public.salvar_rascunho_atual_entrada_v17_25(uuid,text,date,numeric,numeric,text,text,integer,date,jsonb) from public;
grant execute on function public.salvar_rascunho_atual_entrada_v17_25(uuid,text,date,numeric,numeric,text,text,integer,date,jsonb) to authenticated;

commit;
notify pgrst, 'reload schema';
