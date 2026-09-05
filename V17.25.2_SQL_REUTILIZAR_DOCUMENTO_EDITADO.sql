-- THITA Store V17.25.2
-- Permite concluir novamente uma nota reaberta para edição.

begin;

create or replace function public.liberar_documento_cancelado_antes_entrada_v17_25_2()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.entradas_mercadorias
     set numero_documento=numero_documento || ' [EDITADA ' || left(id::text,8) || ']'
   where fornecedor_id=new.fornecedor_id
     and numero_documento=new.numero_documento
     and status='cancelada';
  return new;
end $$;

drop trigger if exists liberar_documento_cancelado_v17_25_2 on public.entradas_mercadorias;
create trigger liberar_documento_cancelado_v17_25_2
before insert on public.entradas_mercadorias
for each row execute function public.liberar_documento_cancelado_antes_entrada_v17_25_2();

-- Corrige também uma nota que já esteja aberta no rascunho neste momento.
update public.entradas_mercadorias e
   set numero_documento=e.numero_documento || ' [EDITADA ' || left(e.id::text,8) || ']'
  from public.entradas r
 where e.status='cancelada'
   and r.status='rascunho'
   and r.fornecedor_id=e.fornecedor_id
   and r.numero_documento=e.numero_documento;

commit;
