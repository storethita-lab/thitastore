-- THITA STORE V17.29 - valor e data informados ao receber uma parcela
-- Execute uma vez no SQL Editor do Supabase.

alter table public.crediario_parcelas_v17_13
  add column if not exists valor_original numeric(14,2),
  add column if not exists valor_recebido numeric(14,2);

create or replace function public.receber_parcela_crediario_v17_29(
  p_parcela_id uuid,
  p_valor_recebido numeric,
  p_data_recebimento date
) returns void
language plpgsql security definer set search_path=public as $$
declare v_valor numeric(14,2); v_status text;
begin
  if coalesce(p_valor_recebido,0)<=0 then raise exception 'Informe um valor recebido maior que zero.'; end if;
  if p_data_recebimento is null then raise exception 'Informe a data do recebimento.'; end if;
  select valor,status into v_valor,v_status from public.crediario_parcelas_v17_13 where id=p_parcela_id for update;
  if not found then raise exception 'Parcela não encontrada.'; end if;
  if v_status='paga' then raise exception 'Esta parcela já foi recebida.'; end if;
  update public.crediario_parcelas_v17_13
     set valor_original=coalesce(valor_original,v_valor), valor=round(p_valor_recebido,2), valor_recebido=round(p_valor_recebido,2)
   where id=p_parcela_id;
  perform public.registrar_pagamento_parcela_v17_13(p_parcela_id,true,p_data_recebimento);
end;$$;

create or replace function public.desfazer_recebimento_crediario_v17_29(p_parcela_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.registrar_pagamento_parcela_v17_13(p_parcela_id,false,null);
  update public.crediario_parcelas_v17_13
     set valor=coalesce(valor_original,valor), valor_recebido=null
   where id=p_parcela_id;
end;$$;

revoke all on function public.receber_parcela_crediario_v17_29(uuid,numeric,date) from public;
revoke all on function public.desfazer_recebimento_crediario_v17_29(uuid) from public;
grant execute on function public.receber_parcela_crediario_v17_29(uuid,numeric,date) to authenticated;
grant execute on function public.desfazer_recebimento_crediario_v17_29(uuid) to authenticated;
