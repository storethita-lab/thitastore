-- THITA STORE V17.31 - relatório de vendedores, comissões e taxas de cartão
-- Execute uma vez depois do SQL V17.30.
begin;

create table if not exists public.config_taxas_cartao_v17_31(
  id smallint primary key default 1 check(id=1),
  taxa_credito numeric(7,4) not null default 0 check(taxa_credito between 0 and 100),
  taxa_debito numeric(7,4) not null default 0 check(taxa_debito between 0 and 100),
  updated_at timestamptz not null default now()
);
insert into public.config_taxas_cartao_v17_31(id) values(1) on conflict(id) do nothing;
alter table public.config_taxas_cartao_v17_31 enable row level security;
drop policy if exists taxas_cartao_leitura_v17_31 on public.config_taxas_cartao_v17_31;
create policy taxas_cartao_leitura_v17_31 on public.config_taxas_cartao_v17_31 for select to authenticated using(true);

alter table public.vendas_v17_12
  add column if not exists taxa_administrativa_percentual numeric(7,4) not null default 0,
  add column if not exists valor_taxa_administrativa numeric(14,2) not null default 0,
  add column if not exists comissao_paga boolean not null default false,
  add column if not exists data_comissao_pagamento date;

create or replace function public.salvar_taxas_cartao_v17_31(p_taxa_credito numeric,p_taxa_debito numeric)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.';end if;
  if coalesce(p_taxa_credito,-1)<0 or p_taxa_credito>100 or coalesce(p_taxa_debito,-1)<0 or p_taxa_debito>100 then raise exception 'As taxas devem ficar entre 0%% e 100%%.';end if;
  update public.config_taxas_cartao_v17_31 set taxa_credito=p_taxa_credito,taxa_debito=p_taxa_debito,updated_at=now() where id=1;
end $$;

create or replace function public.marcar_comissao_paga_v17_31(p_venda_id uuid,p_paga boolean,p_data date)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.';end if;
  update public.vendas_v17_12 set comissao_paga=coalesce(p_paga,false),data_comissao_pagamento=case when p_paga then coalesce(p_data,current_date) else null end where id=p_venda_id and vendedor_id is not null;
  if not found then raise exception 'Venda com vendedor não encontrada.';end if;
end $$;

create or replace view public.relatorio_vendedores_v17_31 with(security_invoker=true) as
select v.id as venda_id,v.numero,v.data_venda,v.forma_pagamento,v.total,v.desconto,v.entrega,v.status,
       v.vendedor_id,vd.nome as vendedor,v.comissao_percentual,v.valor_comissao,v.comissao_paga,v.data_comissao_pagamento,
       v.taxa_administrativa_percentual,v.valor_taxa_administrativa,
       round(v.total-v.valor_taxa_administrativa-v.valor_comissao,2) as valor_liquido,
       c.nome as cliente,coalesce((select sum(i.quantidade) from public.venda_itens_v17_12 i where i.venda_id=v.id),0) as unidades
  from public.vendas_v17_12 v
  left join public.vendedores_v17_30 vd on vd.id=v.vendedor_id
  left join public.clientes c on c.id=v.cliente_id;

create or replace function public.finalizar_rascunho_venda_v17_30(p_rascunho_id uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_r public.vendas_rascunhos_v17_28;v_itens jsonb;v_subtotal numeric;v_total numeric;v_soma_parcelas numeric;v_numero text;v_venda_id uuid;v_comissao numeric;v_taxa numeric:=0;v_valor jsonb;v_indice integer:=0;
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
  select case when v_r.forma_pagamento='Cartão de Crédito' then taxa_credito when v_r.forma_pagamento='Cartão de Débito' then taxa_debito else 0 end into v_taxa from public.config_taxas_cartao_v17_31 where id=1;
  update public.vendas_v17_12 set vendedor_id=v_r.vendedor_id,comissao_percentual=v_comissao,valor_comissao=round(v_total*v_comissao/100,2),taxa_administrativa_percentual=coalesce(v_taxa,0),valor_taxa_administrativa=round(v_total*coalesce(v_taxa,0)/100,2) where id=v_venda_id;
  if v_r.forma_pagamento='Crediário' then for v_valor in select value from jsonb_array_elements(v_r.parcelas_personalizadas) loop v_indice:=v_indice+1;update public.crediario_parcelas_v17_13 set valor=(v_valor#>>'{}')::numeric where venda_id=v_venda_id and parcela_numero=v_indice;end loop;end if;
  delete from public.vendas_rascunhos_v17_28 where id=p_rascunho_id;
  return v_numero;
end $$;

revoke all on function public.salvar_taxas_cartao_v17_31(numeric,numeric) from public;
revoke all on function public.marcar_comissao_paga_v17_31(uuid,boolean,date) from public;
grant execute on function public.salvar_taxas_cartao_v17_31(numeric,numeric) to authenticated;
grant execute on function public.marcar_comissao_paga_v17_31(uuid,boolean,date) to authenticated;
grant select on public.relatorio_vendedores_v17_31 to authenticated;
commit;
