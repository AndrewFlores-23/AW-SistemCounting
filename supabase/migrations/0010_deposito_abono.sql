-- Casilla "Depósito": el vendedor confirma que el abono del cliente ya está en la cuenta.
-- Es solo de control; no cambia ningún saldo.
alter table public.movimientos_cliente add column deposito boolean not null default false;

-- clientes_del_dia devuelve la casilla y ordena la lista por nombre (A→Z)
drop function public.clientes_del_dia(date);
create function public.clientes_del_dia(p_fecha date)
returns table (
  id uuid, nombre text, saldo_inicial numeric, tiene_historial boolean, saldo_anterior numeric,
  mov_id uuid, jugadas numeric, abono numeric, premios numeric, saldo_total numeric, nota text,
  nota_anterior text, fecha_nota_anterior date, deposito boolean
)
language sql stable security invoker set search_path = public as $$
  select c.id, c.nombre, c.saldo_inicial,
         prev.saldo_total is not null,
         coalesce(prev.saldo_total, c.saldo_inicial),
         m.id, m.jugadas, m.abono, m.premios, m.saldo_total, m.nota,
         nullif(trim(prev.nota), ''), prev.fecha, coalesce(m.deposito, false)
  from clientes c
  left join lateral (
    select mm.saldo_total, mm.nota, mm.fecha from movimientos_cliente mm
    where mm.cliente_id = c.id and mm.fecha < p_fecha
    order by mm.fecha desc limit 1
  ) prev on true
  left join movimientos_cliente m on m.cliente_id = c.id and m.fecha = p_fecha
  where c.vendedor_id = auth.uid() and c.activo
  order by lower(c.nombre), c.creado_en;
$$;
revoke execute on function public.clientes_del_dia(date) from anon;
