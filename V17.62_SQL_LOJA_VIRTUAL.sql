-- THITA STORE V17.62 - configuração da empresa, fretes e pedidos do catálogo
begin;

create table if not exists public.config_empresa_v17_62(
 id integer primary key default 1 check(id=1),nome text not null default 'THITA Store',whatsapp text,email text,
 telefone text,chave_pix text,tipo_chave_pix text,cep text,logradouro text,numero text,bairro text,cidade text,estado text,complemento text,
 retirada_instrucao text,updated_at timestamptz not null default now()
);
insert into public.config_empresa_v17_62(id) values(1) on conflict(id) do nothing;

create table if not exists public.fretes_cep_v17_62(
 id uuid primary key default gen_random_uuid(),nome text not null,cep_inicial text not null,cep_final text not null,
 valor numeric(12,2) not null check(valor>=0),prazo_dias integer not null default 1 check(prazo_dias>=0),ativo boolean not null default true
);
create table if not exists public.fretes_localidade_v17_62(
 id uuid primary key default gen_random_uuid(),localidade text not null,valor numeric(12,2) not null check(valor>=0),
 prazo_dias integer not null default 1 check(prazo_dias>=0),ativo boolean not null default true
);
create table if not exists public.pedidos_catalogo_v17_62(
 id uuid primary key default gen_random_uuid(),numero bigint generated always as identity unique,status text not null default 'novo',
 criado_em timestamptz not null default now(),tipo_recebimento text not null,frete numeric(12,2) not null default 0,
 subtotal numeric(12,2) not null,total numeric(12,2) not null,cep text,logradouro text,numero_endereco text,bairro text,cidade text,estado text,complemento text,
 cliente_email text not null,cliente_nome text not null,cliente_whatsapp text not null,forma_pagamento text not null,troco_para numeric(12,2),itens jsonb not null
);

alter table public.config_empresa_v17_62 enable row level security;
alter table public.fretes_cep_v17_62 enable row level security;
alter table public.fretes_localidade_v17_62 enable row level security;
alter table public.pedidos_catalogo_v17_62 enable row level security;
drop policy if exists config_empresa_leitura_publica_v17_62 on public.config_empresa_v17_62;
create policy config_empresa_leitura_publica_v17_62 on public.config_empresa_v17_62 for select using(true);
drop policy if exists fretes_cep_leitura_publica_v17_62 on public.fretes_cep_v17_62;
create policy fretes_cep_leitura_publica_v17_62 on public.fretes_cep_v17_62 for select using(ativo=true);
drop policy if exists fretes_localidade_leitura_publica_v17_62 on public.fretes_localidade_v17_62;
create policy fretes_localidade_leitura_publica_v17_62 on public.fretes_localidade_v17_62 for select using(ativo=true);
drop policy if exists pedidos_admin_v17_62 on public.pedidos_catalogo_v17_62;
create policy pedidos_admin_v17_62 on public.pedidos_catalogo_v17_62 for select to authenticated using(true);

create or replace function public.salvar_config_empresa_v17_62(p_dados jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Usuário não autenticado.';end if;
 update public.config_empresa_v17_62 set nome=coalesce(nullif(btrim(p_dados->>'nome'),''),nome),whatsapp=nullif(btrim(p_dados->>'whatsapp'),''),email=nullif(btrim(p_dados->>'email'),''),telefone=nullif(btrim(p_dados->>'telefone'),''),chave_pix=nullif(btrim(p_dados->>'chave_pix'),''),tipo_chave_pix=nullif(btrim(p_dados->>'tipo_chave_pix'),''),cep=nullif(btrim(p_dados->>'cep'),''),logradouro=nullif(btrim(p_dados->>'logradouro'),''),numero=nullif(btrim(p_dados->>'numero'),''),bairro=nullif(btrim(p_dados->>'bairro'),''),cidade=nullif(btrim(p_dados->>'cidade'),''),estado=nullif(btrim(p_dados->>'estado'),''),complemento=nullif(btrim(p_dados->>'complemento'),''),retirada_instrucao=nullif(btrim(p_dados->>'retirada_instrucao'),''),updated_at=now() where id=1;
end$$;

create or replace function public.salvar_frete_v17_62(p_tipo text,p_id uuid,p_nome text,p_cep_inicial text,p_cep_final text,p_valor numeric,p_prazo integer,p_ativo boolean) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid:=coalesce(p_id,gen_random_uuid());begin
 if auth.uid() is null then raise exception 'Usuário não autenticado.';end if;
 if nullif(btrim(p_nome),'') is null or coalesce(p_valor,-1)<0 then raise exception 'Informe nome/localidade e valor válido.';end if;
 if p_tipo='cep' then
  if length(regexp_replace(coalesce(p_cep_inicial,''),'\D','','g'))<>8 or length(regexp_replace(coalesce(p_cep_final,''),'\D','','g'))<>8 then raise exception 'Informe a faixa de CEP completa.';end if;
  insert into public.fretes_cep_v17_62(id,nome,cep_inicial,cep_final,valor,prazo_dias,ativo) values(v_id,btrim(p_nome),regexp_replace(p_cep_inicial,'\D','','g'),regexp_replace(p_cep_final,'\D','','g'),p_valor,coalesce(p_prazo,1),coalesce(p_ativo,true)) on conflict(id) do update set nome=excluded.nome,cep_inicial=excluded.cep_inicial,cep_final=excluded.cep_final,valor=excluded.valor,prazo_dias=excluded.prazo_dias,ativo=excluded.ativo;
 elsif p_tipo='localidade' then
  insert into public.fretes_localidade_v17_62(id,localidade,valor,prazo_dias,ativo) values(v_id,btrim(p_nome),p_valor,coalesce(p_prazo,1),coalesce(p_ativo,true)) on conflict(id) do update set localidade=excluded.localidade,valor=excluded.valor,prazo_dias=excluded.prazo_dias,ativo=excluded.ativo;
 else raise exception 'Tipo de frete inválido.';end if;return v_id;
end$$;

create or replace function public.criar_pedido_catalogo_v17_62(p_dados jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;v_numero bigint;v_subtotal numeric:=0;v_frete numeric:=0;v_total numeric;v_itens jsonb;v_item jsonb;v_preco numeric;v_estoque integer;v_qtd integer;v_cep text;begin
 v_itens:=p_dados->'itens';
 if jsonb_typeof(v_itens)<>'array' or jsonb_array_length(v_itens)=0 then raise exception 'A sacola está vazia.';end if;
 if nullif(btrim(p_dados->>'cliente_nome'),'') is null or nullif(btrim(p_dados->>'cliente_email'),'') is null or nullif(btrim(p_dados->>'cliente_whatsapp'),'') is null then raise exception 'Preencha os dados pessoais.';end if;
 for v_item in select value from jsonb_array_elements(v_itens) loop
  v_qtd:=coalesce((v_item->>'quantidade')::integer,0);
  select case when p.promocao and p.preco_promocional is not null then p.preco_promocional else p.preco end,pv.estoque into v_preco,v_estoque from public.produto_variantes pv join public.produtos p on p.id=pv.produto_id where pv.id=(v_item->>'variante_id')::uuid and pv.ativo and p.ativo;
  if v_preco is null or v_qtd<1 or v_qtd>v_estoque then raise exception 'Um produto da sacola está indisponível na quantidade solicitada.';end if;
  v_subtotal:=v_subtotal+v_preco*v_qtd;
 end loop;
 if p_dados->>'tipo_recebimento'='entrega' then
  v_cep:=regexp_replace(coalesce(p_dados->>'cep',''),'\D','','g');
  if length(v_cep)=8 then select valor into v_frete from public.fretes_cep_v17_62 where ativo and v_cep between cep_inicial and cep_final order by valor limit 1;
  else select valor into v_frete from public.fretes_localidade_v17_62 where ativo and lower(btrim(localidade))=lower(btrim(p_dados->>'bairro')) order by valor limit 1;end if;
  if v_frete is null then raise exception 'Não foi encontrada uma tarifa válida para o local da entrega.';end if;
 end if;
 v_total:=v_subtotal+v_frete;
 insert into public.pedidos_catalogo_v17_62(tipo_recebimento,frete,subtotal,total,cep,logradouro,numero_endereco,bairro,cidade,estado,complemento,cliente_email,cliente_nome,cliente_whatsapp,forma_pagamento,troco_para,itens)
 values(p_dados->>'tipo_recebimento',v_frete,v_subtotal,v_total,nullif(p_dados->>'cep',''),nullif(p_dados->>'logradouro',''),nullif(p_dados->>'numero_endereco',''),nullif(p_dados->>'bairro',''),nullif(p_dados->>'cidade',''),nullif(p_dados->>'estado',''),nullif(p_dados->>'complemento',''),btrim(p_dados->>'cliente_email'),btrim(p_dados->>'cliente_nome'),btrim(p_dados->>'cliente_whatsapp'),p_dados->>'forma_pagamento',nullif(p_dados->>'troco_para','')::numeric,v_itens) returning id,numero into v_id,v_numero;
 return jsonb_build_object('id',v_id,'numero',v_numero,'total',v_total);
end$$;

grant select on public.config_empresa_v17_62,public.fretes_cep_v17_62,public.fretes_localidade_v17_62 to anon,authenticated;
grant select on public.pedidos_catalogo_v17_62 to authenticated;
grant execute on function public.criar_pedido_catalogo_v17_62(jsonb) to anon,authenticated;
grant execute on function public.salvar_config_empresa_v17_62(jsonb),public.salvar_frete_v17_62(text,uuid,text,text,text,numeric,integer,boolean) to authenticated;
commit;
