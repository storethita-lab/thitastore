-- THITA Store V17.28 - rascunho persistente de venda
begin;

create table if not exists public.vendas_rascunhos_v17_28 (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id),
  data_venda date not null default current_date,
  forma_pagamento text not null default 'Pix',
  desconto numeric(14,2) not null default 0 check(desconto>=0),
  entrega numeric(14,2) not null default 0 check(entrega>=0),
  observacoes text,
  parcelas integer not null default 1 check(parcelas between 1 and 24),
  primeiro_vencimento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(usuario_id)
);

create table if not exists public.vendas_rascunho_itens_v17_28 (
  id uuid primary key default gen_random_uuid(),
  rascunho_id uuid not null references public.vendas_rascunhos_v17_28(id) on delete cascade,
  variante_id uuid not null references public.produto_variantes(id),
  quantidade integer not null check(quantidade>0),
  preco_unitario numeric(14,2) not null check(preco_unitario>0),
  created_at timestamptz not null default now(),
  unique(rascunho_id,variante_id)
);

alter table public.vendas_rascunhos_v17_28 enable row level security;
alter table public.vendas_rascunho_itens_v17_28 enable row level security;
drop policy if exists venda_rascunho_proprio_v17_28 on public.vendas_rascunhos_v17_28;
create policy venda_rascunho_proprio_v17_28 on public.vendas_rascunhos_v17_28 for select to authenticated using(usuario_id=auth.uid());
drop policy if exists venda_rascunho_item_proprio_v17_28 on public.vendas_rascunho_itens_v17_28;
create policy venda_rascunho_item_proprio_v17_28 on public.vendas_rascunho_itens_v17_28 for select to authenticated using(exists(select 1 from public.vendas_rascunhos_v17_28 r where r.id=rascunho_id and r.usuario_id=auth.uid()));

create or replace function public.obter_rascunho_venda_v17_28()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_r public.vendas_rascunhos_v17_28;v_result jsonb;
begin
  if v_user is null then raise exception 'Usuario nao autenticado.';end if;
  insert into public.vendas_rascunhos_v17_28(usuario_id) values(v_user)
  on conflict(usuario_id) do update set usuario_id=excluded.usuario_id returning * into v_r;
  select to_jsonb(v_r)||jsonb_build_object('itens',coalesce(jsonb_agg(jsonb_build_object('variante_id',i.variante_id,'quantidade',i.quantidade,'preco_unitario',i.preco_unitario) order by i.created_at) filter(where i.id is not null),'[]'::jsonb)) into v_result
  from public.vendas_rascunho_itens_v17_28 i where i.rascunho_id=v_r.id;
  return v_result;
end $$;

create or replace function public.salvar_rascunho_venda_v17_28(p_rascunho_id uuid,p_cliente_id uuid,p_data_venda date,p_forma_pagamento text,p_desconto numeric,p_entrega numeric,p_observacoes text,p_parcelas integer,p_primeiro_vencimento date,p_itens jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_item jsonb;
begin
  if auth.uid() is null then raise exception 'Usuario nao autenticado.';end if;
  if coalesce(p_desconto,0)<0 or coalesce(p_entrega,0)<0 then raise exception 'Desconto ou entrega invalido.';end if;
  if jsonb_typeof(coalesce(p_itens,'[]'::jsonb))<>'array' then raise exception 'Lista de itens invalida.';end if;
  update public.vendas_rascunhos_v17_28 set cliente_id=p_cliente_id,data_venda=coalesce(p_data_venda,current_date),forma_pagamento=coalesce(nullif(btrim(p_forma_pagamento),''),'Pix'),desconto=coalesce(p_desconto,0),entrega=coalesce(p_entrega,0),observacoes=nullif(btrim(p_observacoes),''),parcelas=case when p_forma_pagamento='Crediário' then least(24,greatest(coalesce(p_parcelas,1),1)) else 1 end,primeiro_vencimento=case when p_forma_pagamento='Crediário' then p_primeiro_vencimento else null end,updated_at=now()
   where id=p_rascunho_id and usuario_id=auth.uid();
  if not found then raise exception 'Rascunho de venda nao encontrado.';end if;
  delete from public.vendas_rascunho_itens_v17_28 where rascunho_id=p_rascunho_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_itens,'[]'::jsonb)) loop
    insert into public.vendas_rascunho_itens_v17_28(rascunho_id,variante_id,quantidade,preco_unitario)
    values(p_rascunho_id,(v_item->>'variante_id')::uuid,(v_item->>'quantidade')::integer,(v_item->>'preco_unitario')::numeric);
  end loop;
  return jsonb_build_object('id',p_rascunho_id,'saved_at',now());
end $$;

create or replace function public.finalizar_rascunho_venda_v17_28(p_rascunho_id uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_r public.vendas_rascunhos_v17_28;v_itens jsonb;v_subtotal numeric;v_numero text;
begin
  if auth.uid() is null then raise exception 'Usuario nao autenticado.';end if;
  select * into v_r from public.vendas_rascunhos_v17_28 where id=p_rascunho_id and usuario_id=auth.uid() for update;
  if not found then raise exception 'Rascunho de venda nao encontrado.';end if;
  if v_r.cliente_id is null then raise exception 'Selecione o cliente.';end if;
  if v_r.forma_pagamento='Crediário' and v_r.primeiro_vencimento is null then raise exception 'Informe o primeiro vencimento.';end if;
  select sum(quantidade*preco_unitario),jsonb_agg(jsonb_build_object('variante_id',variante_id,'quantidade',quantidade,'preco_unitario',preco_unitario)) into v_subtotal,v_itens from public.vendas_rascunho_itens_v17_28 where rascunho_id=p_rascunho_id;
  if v_itens is null then raise exception 'Adicione pelo menos um item.';end if;
  if v_r.desconto>v_subtotal+v_r.entrega then raise exception 'Desconto maior que o total da venda.';end if;
  select public.registrar_venda_v17_13(v_r.cliente_id,v_r.data_venda,v_r.forma_pagamento,v_r.desconto,v_r.entrega,v_r.observacoes,v_itens,case when v_r.forma_pagamento='Crediário' then v_r.parcelas else 1 end,case when v_r.forma_pagamento='Crediário' then v_r.primeiro_vencimento else null end)::text into v_numero;
  delete from public.vendas_rascunhos_v17_28 where id=p_rascunho_id;
  return v_numero;
end $$;

create or replace function public.cancelar_rascunho_venda_v17_28(p_rascunho_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  delete from public.vendas_rascunhos_v17_28 where id=p_rascunho_id and usuario_id=auth.uid();
  if not found then raise exception 'Rascunho de venda nao encontrado.';end if;
end $$;

revoke all on function public.obter_rascunho_venda_v17_28() from public;
revoke all on function public.salvar_rascunho_venda_v17_28(uuid,uuid,date,text,numeric,numeric,text,integer,date,jsonb) from public;
revoke all on function public.finalizar_rascunho_venda_v17_28(uuid) from public;
revoke all on function public.cancelar_rascunho_venda_v17_28(uuid) from public;
grant execute on function public.obter_rascunho_venda_v17_28() to authenticated;
grant execute on function public.salvar_rascunho_venda_v17_28(uuid,uuid,date,text,numeric,numeric,text,integer,date,jsonb) to authenticated;
grant execute on function public.finalizar_rascunho_venda_v17_28(uuid) to authenticated;
grant execute on function public.cancelar_rascunho_venda_v17_28(uuid) to authenticated;
commit;
