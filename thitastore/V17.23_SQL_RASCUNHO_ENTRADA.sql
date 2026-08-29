-- THITA Store V17.23 - rascunho persistente de entrada de mercadoria
-- Execute uma unica vez no SQL Editor do Supabase, depois dos scripts V17.17.

begin;

create table if not exists public.entradas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  fornecedor_id uuid references public.fornecedores(id),
  numero_documento text,
  data_entrada date not null default current_date,
  frete numeric(14,2) not null default 0 check (frete >= 0),
  observacoes text,
  forma_pagamento text,
  parcelas_pagamento integer not null default 1 check (parcelas_pagamento >= 1),
  primeiro_vencimento date,
  status text not null default 'rascunho' check (status in ('rascunho','finalizada','cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalizada_at timestamptz,
  cancelada_at timestamptz
);

-- Compatibilidade com bases em que a tabela entradas ja existia.
alter table public.entradas add column if not exists usuario_id uuid references auth.users(id) on delete cascade;
alter table public.entradas add column if not exists fornecedor_id uuid references public.fornecedores(id);
alter table public.entradas add column if not exists numero_documento text;
alter table public.entradas add column if not exists data_entrada date default current_date;
alter table public.entradas add column if not exists frete numeric(14,2) default 0;
alter table public.entradas add column if not exists observacoes text;
alter table public.entradas add column if not exists forma_pagamento text;
alter table public.entradas add column if not exists parcelas_pagamento integer default 1;
alter table public.entradas add column if not exists primeiro_vencimento date;
alter table public.entradas add column if not exists status text default 'rascunho';
alter table public.entradas add column if not exists created_at timestamptz default now();
alter table public.entradas add column if not exists updated_at timestamptz default now();
alter table public.entradas add column if not exists finalizada_at timestamptz;
alter table public.entradas add column if not exists cancelada_at timestamptz;

create table if not exists public.entrada_rascunho_itens (
  id uuid primary key default gen_random_uuid(),
  entrada_id uuid not null references public.entradas(id) on delete cascade,
  variante_id uuid not null references public.produto_variantes(id),
  quantidade integer not null check (quantidade > 0),
  custo_unitario numeric(14,2) not null check (custo_unitario >= 0),
  created_at timestamptz not null default now(),
  unique (entrada_id, variante_id)
);

create unique index if not exists entradas_um_rascunho_por_usuario
  on public.entradas (usuario_id) where status = 'rascunho';
create index if not exists entrada_rascunho_itens_entrada_idx
  on public.entrada_rascunho_itens (entrada_id);

alter table public.entradas enable row level security;
alter table public.entrada_rascunho_itens enable row level security;

drop policy if exists entradas_proprio_usuario on public.entradas;
create policy entradas_proprio_usuario on public.entradas
  for select to authenticated using (usuario_id = auth.uid());

drop policy if exists entrada_itens_proprio_usuario on public.entrada_rascunho_itens;
create policy entrada_itens_proprio_usuario on public.entrada_rascunho_itens
  for select to authenticated using (
    exists (select 1 from public.entradas e where e.id = entrada_id and e.usuario_id = auth.uid())
  );

create or replace function public.obter_rascunho_entrada_v17_23()
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

create or replace function public.salvar_rascunho_entrada_v17_23(
  p_entrada_id uuid, p_fornecedor_id uuid, p_numero_documento text, p_data_entrada date,
  p_frete numeric, p_observacoes text, p_forma_pagamento text, p_parcelas_pagamento integer,
  p_primeiro_vencimento date, p_itens jsonb
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_item jsonb;
begin
  if v_user is null then raise exception 'Usuario nao autenticado.'; end if;
  if jsonb_typeof(coalesce(p_itens,'[]'::jsonb)) <> 'array' then raise exception 'Lista de itens invalida.'; end if;
  update public.entradas set
    fornecedor_id=p_fornecedor_id, numero_documento=nullif(btrim(p_numero_documento),''),
    data_entrada=coalesce(p_data_entrada,current_date), frete=greatest(coalesce(p_frete,0),0),
    observacoes=nullif(btrim(p_observacoes),''), forma_pagamento=nullif(btrim(p_forma_pagamento),''),
    parcelas_pagamento=greatest(coalesce(p_parcelas_pagamento,1),1), primeiro_vencimento=p_primeiro_vencimento,
    updated_at=now()
  where id=p_entrada_id and usuario_id=v_user and status='rascunho';
  if not found then raise exception 'Rascunho nao encontrado ou ja encerrado.'; end if;
  delete from public.entrada_rascunho_itens where entrada_id=p_entrada_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_itens,'[]'::jsonb)) loop
    if coalesce((v_item->>'quantidade')::integer,0)<=0 or coalesce((v_item->>'custo_unitario')::numeric,-1)<0 then
      raise exception 'Quantidade ou custo invalido.';
    end if;
    insert into public.entrada_rascunho_itens(entrada_id,variante_id,quantidade,custo_unitario)
    values(p_entrada_id,(v_item->>'variante_id')::uuid,(v_item->>'quantidade')::integer,(v_item->>'custo_unitario')::numeric);
  end loop;
  return jsonb_build_object('id',p_entrada_id,'saved_at',now());
end $$;

create or replace function public.cancelar_rascunho_entrada_v17_23(p_entrada_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Usuario nao autenticado.'; end if;
  update public.entradas set status='cancelada',cancelada_at=now(),updated_at=now()
   where id=p_entrada_id and usuario_id=auth.uid() and status='rascunho';
  if not found then raise exception 'Rascunho nao encontrado ou ja encerrado.'; end if;
  delete from public.entrada_rascunho_itens where entrada_id=p_entrada_id;
end $$;

create or replace function public.finalizar_rascunho_entrada_v17_23(p_entrada_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_e public.entradas; v_itens jsonb;
begin
  if auth.uid() is null then raise exception 'Usuario nao autenticado.'; end if;
  select * into v_e from public.entradas where id=p_entrada_id and usuario_id=auth.uid() for update;
  if not found or v_e.status<>'rascunho' then raise exception 'Rascunho nao encontrado ou ja encerrado.'; end if;
  if v_e.fornecedor_id is null then raise exception 'Selecione o fornecedor.'; end if;
  if nullif(btrim(v_e.numero_documento),'') is null then raise exception 'Informe o numero da nota/documento.'; end if;
  if nullif(btrim(v_e.forma_pagamento),'') is null then raise exception 'Selecione a forma de pagamento.'; end if;
  if v_e.forma_pagamento in ('Cartão de Crédito','Boleto') and v_e.primeiro_vencimento is null then raise exception 'Informe o primeiro vencimento.'; end if;
  select jsonb_agg(jsonb_build_object('variante_id',variante_id,'quantidade',quantidade,'custo_unitario',custo_unitario))
    into v_itens from public.entrada_rascunho_itens where entrada_id=p_entrada_id;
  if v_itens is null then raise exception 'Adicione pelo menos um item.'; end if;

  -- A funcao existente valida variantes, grava a entrada definitiva e seus itens,
  -- atualiza estoque, cria movimentacoes, financeiro/parcelas e auditoria.
  perform public.registrar_entrada_v17_17(
    v_e.fornecedor_id,v_e.numero_documento,v_e.data_entrada,v_e.frete,v_e.observacoes,
    v_e.forma_pagamento,v_e.parcelas_pagamento,v_e.primeiro_vencimento,v_itens
  );
  update public.entradas set status='finalizada',finalizada_at=now(),updated_at=now() where id=p_entrada_id;
end $$;

revoke all on function public.obter_rascunho_entrada_v17_23() from public;
revoke all on function public.salvar_rascunho_entrada_v17_23(uuid,uuid,text,date,numeric,text,text,integer,date,jsonb) from public;
revoke all on function public.cancelar_rascunho_entrada_v17_23(uuid) from public;
revoke all on function public.finalizar_rascunho_entrada_v17_23(uuid) from public;
grant execute on function public.obter_rascunho_entrada_v17_23() to authenticated;
grant execute on function public.salvar_rascunho_entrada_v17_23(uuid,uuid,text,date,numeric,text,text,integer,date,jsonb) to authenticated;
grant execute on function public.cancelar_rascunho_entrada_v17_23(uuid) to authenticated;
grant execute on function public.finalizar_rascunho_entrada_v17_23(uuid) to authenticated;

commit;
