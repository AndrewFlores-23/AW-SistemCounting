-- Nota opcional por cliente y día; al día siguiente se muestra como recordatorio
alter table public.movimientos_cliente
  add column nota text check (char_length(nota) <= 280);

-- Los cambios de nota también quedan en la bitácora
drop trigger bitacora_movimientos_upd on public.movimientos_cliente;
create trigger bitacora_movimientos_upd after update on public.movimientos_cliente
  for each row when ((old.saldo_anterior, old.jugadas, old.abono, old.premios, old.nota)
    is distinct from (new.saldo_anterior, new.jugadas, new.abono, new.premios, new.nota))
  execute function public.registrar_bitacora();

-- Cambia el tipo de retorno: hay que recrearla
drop function public.clientes_del_dia(date);
create function public.clientes_del_dia(p_fecha date)
returns table (
  id uuid, nombre text, saldo_inicial numeric, tiene_historial boolean, saldo_anterior numeric,
  mov_id uuid, jugadas numeric, abono numeric, premios numeric, saldo_total numeric, nota text,
  nota_anterior text, fecha_nota_anterior date
)
language sql stable security invoker set search_path = public as $$
  select c.id, c.nombre, c.saldo_inicial,
         prev.saldo_total is not null,
         coalesce(prev.saldo_total, c.saldo_inicial),
         m.id, m.jugadas, m.abono, m.premios, m.saldo_total, m.nota,
         nullif(trim(prev.nota), ''), prev.fecha
  from clientes c
  left join lateral (
    select mm.saldo_total, mm.nota, mm.fecha from movimientos_cliente mm
    where mm.cliente_id = c.id and mm.fecha < p_fecha
    order by mm.fecha desc limit 1
  ) prev on true
  left join movimientos_cliente m on m.cliente_id = c.id and m.fecha = p_fecha
  where c.vendedor_id = auth.uid() and c.activo
  order by c.creado_en;
$$;
revoke execute on function public.clientes_del_dia(date) from anon;
