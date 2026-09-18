-- La descripción del ajuste vive en el cierre; no se copia como nota del cliente
-- (si no, aparecería como recordatorio al día siguiente).
create or replace function public.registrar_ajuste(p_fecha date, p_saldos jsonb, p_nota text)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_cierre uuid;
begin
  if p_fecha >= public.hoy_cr() then
    raise exception 'El ajuste tiene que ser de un día anterior a hoy';
  end if;

  insert into cierres (fecha, tipo, nota, etapa)
  values (p_fecha, 'ajuste', p_nota, 1)
  returning id into v_cierre;

  insert into movimientos_cliente (cierre_id, cliente_id, fecha, saldo_anterior, ajuste)
  select v_cierre, d.id, p_fecha, d.saldo_anterior, s.saldo - d.saldo_anterior
  from public.clientes_del_dia(p_fecha) d
  join jsonb_to_recordset(p_saldos) as s(cliente_id uuid, saldo numeric) on s.cliente_id = d.id
  where s.saldo <> d.saldo_anterior;

  update cierres set etapa = 4, finalizado_en = now() where id = v_cierre;
  return v_cierre;
end $$;
