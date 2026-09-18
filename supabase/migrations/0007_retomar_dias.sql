-- Retomar la línea después de días sin usar la app:
-- registrar días atrasados, marcar días sin trabajo o ajustar saldos según el cuaderno.

alter table public.cierres
  add column tipo text not null default 'normal'
    check (tipo in ('normal', 'atrasado', 'sin_trabajo', 'ajuste')),
  add column nota text;

-- El saldo total ahora incluye un ajuste (solo se usa en cierres de tipo ajuste)
alter table public.movimientos_cliente drop column saldo_total;
alter table public.movimientos_cliente add column ajuste numeric(14,2) not null default 0;
alter table public.movimientos_cliente add column saldo_total numeric(14,2)
  generated always as (saldo_anterior + jugadas - abono - premios + ajuste) stored;

drop trigger bitacora_movimientos_upd on public.movimientos_cliente;
create trigger bitacora_movimientos_upd after update on public.movimientos_cliente
  for each row when ((old.saldo_anterior, old.jugadas, old.abono, old.premios, old.nota, old.ajuste)
    is distinct from (new.saldo_anterior, new.jugadas, new.abono, new.premios, new.nota, new.ajuste))
  execute function public.registrar_bitacora();

-- Guarda el ajuste de saldos en una sola transacción.
-- p_saldos: [{ "cliente_id": uuid, "saldo": número según el cuaderno }]
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

  insert into movimientos_cliente (cierre_id, cliente_id, fecha, saldo_anterior, ajuste, nota)
  select v_cierre, d.id, p_fecha, d.saldo_anterior, s.saldo - d.saldo_anterior, p_nota
  from public.clientes_del_dia(p_fecha) d
  join jsonb_to_recordset(p_saldos) as s(cliente_id uuid, saldo numeric) on s.cliente_id = d.id
  where s.saldo <> d.saldo_anterior;

  update cierres set etapa = 4, finalizado_en = now() where id = v_cierre;
  return v_cierre;
end $$;
revoke execute on function public.registrar_ajuste(date, jsonb, text) from public, anon;
grant execute on function public.registrar_ajuste(date, jsonb, text) to authenticated;
