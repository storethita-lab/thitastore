-- THITA STORE V17.30 - vendedores, comissão e parcelas personalizadas
-- Execute uma vez no SQL Editor do Supabase, depois do SQL V17.29.
begin;

create table if not exists public.vendedores_v17_30(
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  comissao_percentual numeric(7,4) not null default 0 check(comissao_percentual between 0 and 100),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vendedores_v17_30 enable row level security;
drop policy if exists vendedores_leitura_v17_30 on public.vendedores_v17_30;
create policy vendedores_leitura_v17_30 on public.vendedores_v17_30 for select to authenticated using(true);

alter table public.vendas_v17_12
  add column if not exists vendedor_id uuid references public.vendedores_v17_30(id),
  add column if not exists comissao_percentual numeric(7,4) not null default 0,
  add column if not exists valor_comissao numeric(14,2) not null default 0;

alter table public.vendas_rascunhos_v17_28
  add column if not exists vendedor_id uuid references public.vendedores_v17_30(id),
  add column if not exists parcelas_personalizadas jsonb not null default '[]'::jsonb;

create or replace function public.salvar_vendedor_v17_30(p_id uuid,p_nome text,p_comissao_percentual numeric,p_ativo boolean)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  if nullif(btrim(p_nome),'') is null then raise exception 'Informe o nome do vendedor.'; end if;
  if coalesce(p_comissao_percentual,-1)<0 or p_comissao_percentual>100 then raise exception 'Comissão inválida.'; end if;
  if p_id is null then
    insert into public.vendedores_v17_30(nome,comissao_percentual,ativo) values(btrim(p_nome),p_comissao_percentual,coalesce(p_ativo,true)) returning id into v_id;
  else
    update public.vendedores_v17_30 set nome=btrim(p_nome),comissao_percentual=p_comissao_percentual,ativo=coalesce(p_ativo,true),updated_at=now() where id=p_id returning id into v_id;
    if v_id is null then raise exception 'Vendedor não encontrado.'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.excluir_vendedor_v17_30(p_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  delete from public.vendedores_v17_30 where id=p_id;
  if not found then raise exception 'Vendedor não encontrado.'; end if;
exception when foreign_key_violation then raise exception 'Este vendedor já possui vendas. Inative-o em vez de excluir.';
end $$;

create or replace function public.obter_rascunho_venda_v17_30()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_r public.vendas_rascunhos_v17_28;v_result jsonb;
begin
  if v_user is null then raise exception 'Usuário não autenticado.';end if;
  insert into public.vendas_rascunhos_v17_28(usuario_id) values(v_user)
  on conflict(usuario_id) do update set usuario_id=excluded.usuario_id returning * into v_r;
  select to_jsonb(v_r)||jsonb_build_object('itens',coalesce(jsonb_agg(jsonb_build_object('variante_id',i.variante_id,'quantidade',i.quantidade,'preco_unitario',i.preco_unitario) order by i.created_at) filter(where i.id is not null),'[]'::jsonb)) into v_result
  from public.vendas_rascunho_itens_v17_28 i where i.rascunho_id=v_r.id;
  return v_result;
end $$;

create or replace function public.salvar_rascunho_venda_v17_30(p_rascunho_id uuid,p_cliente_id uuid,p_vendedor_id uuid,p_data_venda date,p_forma_pagamento text,p_desconto numeric,p_entrega numeric,p_observacoes text,p_parcelas integer,p_primeiro_vencimento date,p_parcelas_personalizadas jsonb,p_itens jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_item jsonb;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.';end if;
  if coalesce(p_desconto,0)<0 or coalesce(p_entrega,0)<0 then raise exception 'Desconto ou entrega inválido.';end if;
  if jsonb_typeof(coalesce(p_itens,'[]'::jsonb))<>'array' then raise exception 'Lista de itens inválida.';end if;
  if jsonb_typeof(coalesce(p_parcelas_personalizadas,'[]'::jsonb))<>'array' then raise exception 'Lista de parcelas inválida.';end if;
  update public.vendas_rascunhos_v17_28 set cliente_id=p_cliente_id,vendedor_id=p_vendedor_id,data_venda=coalesce(p_data_venda,current_date),forma_pagamento=coalesce(nullif(btrim(p_forma_pagamento),''),'Pix'),desconto=coalesce(p_desconto,0),entrega=coalesce(p_entrega,0),observacoes=nullif(btrim(p_observacoes),''),parcelas=case when p_forma_pagamento='Crediário' then least(24,greatest(coalesce(p_parcelas,1),1)) else 1 end,primeiro_vencimento=case when p_forma_pagamento='Crediário' then p_primeiro_vencimento else null end,parcelas_personalizadas=case when p_forma_pagamento='Crediário' then coalesce(p_parcelas_personalizadas,'[]'::jsonb) else '[]'::jsonb end,updated_at=now()
   where id=p_rascunho_id and usuario_id=auth.uid();
  if not found then raise exception 'Rascunho de venda não encontrado.';end if;
  delete from public.vendas_rascunho_itens_v17_28 where rascunho_id=p_rascunho_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_itens,'[]'::jsonb)) loop
    insert into public.vendas_rascunho_itens_v17_28(rascunho_id,variante_id,quantidade,preco_unitario) values(p_rascunho_id,(v_item->>'variante_id')::uuid,(v_item->>'quantidade')::integer,(v_item->>'preco_unitario')::numeric);
  end loop;
  return jsonb_build_object('id',p_rascunho_id,'saved_at',now());
end $$;

create or replace function public.finalizar_rascunho_venda_v17_30(p_rascunho_id uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_r public.vendas_rascunhos_v17_28;v_itens jsonb;v_subtotal numeric;v_total numeric;v_soma_parcelas numeric;v_numero text;v_venda_id uuid;v_comissao numeric;v_valor jsonb;v_indice integer:=0;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.';end if;
  select * into v_r from public.vendas_rascunhos_v17_28 where id=p_rascunho_id and usuario_id=auth.uid() for update;
  if not found then raise exception 'Rascunho de venda não encontrado.';end if;
  if v_r.cliente_id is null then raise exception 'Selecione o cliente.';end if;
  if v_r.vendedor_id is null then raise exception 'Selecione o vendedor.';end if;
  select comissao_percentual into v_comissao from public.vendedores_v17_30 where id=v_r.vendedor_id and ativo=true;
  if not found then raise exception 'O vendedor selecionado está inativo ou não existe.';end if;
  if v_r.forma_pagamento='Crediário' and v_r.primeiro_vencimento is null then raise exception 'Informe o primeiro vencimento.';end if;
  select sum(quantidade*preco_unitario),jsonb_agg(jsonb_build_object('variante_id',variante_id,'quantidade',quantidade,'preco_unitario',preco_unitario)) into v_subtotal,v_itens from public.vendas_rascunho_itens_v17_28 where rascunho_id=p_rascunho_id;
  if v_itens is null then raise exception 'Adicione pelo menos um item.';end if;
  v_total:=round(v_subtotal-v_r.desconto+v_r.entrega,2);
  if v_total<0 then raise exception 'Desconto maior que o total da venda.';end if;
  if v_r.forma_pagamento='Crediário' then
    if jsonb_array_length(v_r.parcelas_personalizadas)<>v_r.parcelas then raise exception 'Informe o valor de todas as parcelas.';end if;
    select round(sum((value#>>'{}')::numeric),2) into v_soma_parcelas from jsonb_array_elements(v_r.parcelas_personalizadas);
    if exists(select 1 from jsonb_array_elements(v_r.parcelas_personalizadas) x where (x.value#>>'{}')::numeric<=0) then raise exception 'Todas as parcelas devem ter valor maior que zero.';end if;
    if v_soma_parcelas<>v_total then raise exception 'A soma das parcelas deve ser exatamente igual ao total da venda.';end if;
  end if;
  select public.registrar_venda_v17_13(v_r.cliente_id,v_r.data_venda,v_r.forma_pagamento,v_r.desconto,v_r.entrega,v_r.observacoes,v_itens,case when v_r.forma_pagamento='Crediário' then v_r.parcelas else 1 end,case when v_r.forma_pagamento='Crediário' then v_r.primeiro_vencimento else null end)::text into v_numero;
  select id into v_venda_id from public.vendas_v17_12 where numero=v_numero order by created_at desc limit 1;
  update public.vendas_v17_12 set vendedor_id=v_r.vendedor_id,comissao_percentual=v_comissao,valor_comissao=round(v_total*v_comissao/100,2) where id=v_venda_id;
  if v_r.forma_pagamento='Crediário' then
    for v_valor in select value from jsonb_array_elements(v_r.parcelas_personalizadas) loop
      v_indice:=v_indice+1;
      update public.crediario_parcelas_v17_13 set valor=(v_valor#>>'{}')::numeric where venda_id=v_venda_id and parcela_numero=v_indice;
    end loop;
  end if;
  delete from public.vendas_rascunhos_v17_28 where id=p_rascunho_id;
  return v_numero;
end $$;

revoke all on function public.salvar_vendedor_v17_30(uuid,text,numeric,boolean) from public;
revoke all on function public.excluir_vendedor_v17_30(uuid) from public;
revoke all on function public.obter_rascunho_venda_v17_30() from public;
revoke all on function public.salvar_rascunho_venda_v17_30(uuid,uuid,uuid,date,text,numeric,numeric,text,integer,date,jsonb,jsonb) from public;
revoke all on function public.finalizar_rascunho_venda_v17_30(uuid) from public;
grant execute on function public.salvar_vendedor_v17_30(uuid,text,numeric,boolean) to authenticated;
grant execute on function public.excluir_vendedor_v17_30(uuid) to authenticated;
grant execute on function public.obter_rascunho_venda_v17_30() to authenticated;
grant execute on function public.salvar_rascunho_venda_v17_30(uuid,uuid,uuid,date,text,numeric,numeric,text,integer,date,jsonb,jsonb) to authenticated;
grant execute on function public.finalizar_rascunho_venda_v17_30(uuid) to authenticated;
commit;
