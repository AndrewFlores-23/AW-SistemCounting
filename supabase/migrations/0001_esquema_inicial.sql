-- AW_SistemCounting · esquema inicial
-- Usuarios: se crean a mano en Supabase Auth (registro público desactivado).
-- Correo = <usuario>@awcounting.local ; user_metadata.nombre = nombre visible.

-- Día actual en hora de Costa Rica (UTC-6, sin horario de verano)
create or replace function public.hoy_cr() returns date
language sql stable as $$ select (now() at time zone 'America/Costa_Rica')::date $$;

-- ───────── Cierres (etapa 1: ventas, comisión, premios) ─────────
create table public.cierres (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha date not null default public.hoy_cr(),
  ventas numeric(14,2) not null default 0 check (ventas >= 0),
  comision numeric(14,2) not null default 0 check (comision >= 0),
  premios numeric(14,2) not null default 0 check (premios >= 0),
  balance numeric(14,2) generated always as (ventas - comision - premios) stored,
  etapa smallint not null default 1 check (etapa between 1 and 4), -- 4 = finalizado
  finalizado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (vendedor_id, fecha)
);

-- ───────── Clientes de cada vendedor ─────────
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (length(trim(nombre)) > 0),
  saldo_inicial numeric(14,2) not null default 0, -- saldo anterior al darlo de alta
  activo boolean not null default true,            -- eliminar = desactivar; el historial se conserva
  creado_en timestamptz not null default now(),
  eliminado_en timestamptz
);

-- ───────── Movimiento diario por cliente (etapa 2) ─────────
create table public.movimientos_cliente (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cierre_id uuid not null references public.cierres(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  fecha date not null,
  saldo_anterior numeric(14,2) not null default 0,
  jugadas numeric(14,2) not null default 0 check (jugadas >= 0),
  abono numeric(14,2) not null default 0 check (abono >= 0),
  premios numeric(14,2) not null default 0 check (premios >= 0),
  saldo_total numeric(14,2) generated always as (saldo_anterior + jugadas - abono - premios) stored,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (cliente_id, fecha)
);
create index on public.movimientos_cliente (cliente_id, fecha desc);

-- ───────── Bitácora: registro de cada cambio (solo lectura para el vendedor) ─────────
create table public.bitacora (
  id bigint generated always as identity primary key,
  vendedor_id uuid not null,
  fecha_cr date not null default public.hoy_cr(),
  tabla text not null,
  accion text not null,          -- INSERT | UPDATE | DELETE
  registro_id uuid not null,
  antes jsonb,
  despues jsonb,
  creado_en timestamptz not null default now()
);
create index on public.bitacora (vendedor_id, creado_en desc);

create or replace function public.registrar_bitacora() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into bitacora (vendedor_id, tabla, accion, registro_id, despues)
    values (new.vendedor_id, tg_table_name, tg_op, new.id, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into bitacora (vendedor_id, tabla, accion, registro_id, antes, despues)
    values (new.vendedor_id, tg_table_name, tg_op, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into bitacora (vendedor_id, tabla, accion, registro_id, antes)
    values (old.vendedor_id, tg_table_name, tg_op, old.id, to_jsonb(old));
    return old;
  end if;
end $$;

create or replace function public.tocar_actualizado() returns trigger
language plpgsql as $$ begin new.actualizado_en := now(); return new; end $$;

create trigger cierres_actualizado before update on public.cierres
  for each row execute function public.tocar_actualizado();
create trigger movimientos_actualizado before update on public.movimientos_cliente
  for each row execute function public.tocar_actualizado();

-- El autoguardado puede enviar datos sin cambios: esos no ensucian la bitácora
create trigger bitacora_cierres after insert or delete on public.cierres
  for each row execute function public.registrar_bitacora();
create trigger bitacora_cierres_upd after update on public.cierres
  for each row when (old.ventas, old.comision, old.premios, old.etapa)
    is distinct from (new.ventas, new.comision, new.premios, new.etapa)
  execute function public.registrar_bitacora();
create trigger bitacora_movimientos after insert or delete on public.movimientos_cliente
  for each row execute function public.registrar_bitacora();
create trigger bitacora_movimientos_upd after update on public.movimientos_cliente
  for each row when (old.saldo_anterior, old.jugadas, old.abono, old.premios)
    is distinct from (new.saldo_anterior, new.jugadas, new.abono, new.premios)
  execute function public.registrar_bitacora();
create trigger bitacora_clientes after insert or update or delete on public.clientes
  for each row execute function public.registrar_bitacora();

-- ───────── Clientes activos con su saldo anterior para una fecha ─────────
-- saldo_anterior = saldo_total del último día registrado antes de p_fecha,
-- o el saldo_inicial si el cliente es nuevo.
create or replace function public.clientes_del_dia(p_fecha date)
returns table (
  id uuid, nombre text, saldo_inicial numeric, tiene_historial boolean, saldo_anterior numeric,
  mov_id uuid, jugadas numeric, abono numeric, premios numeric, saldo_total numeric
)
language sql stable security invoker set search_path = public as $$
  select c.id, c.nombre, c.saldo_inicial,
         prev.saldo_total is not null,
         coalesce(prev.saldo_total, c.saldo_inicial),
         m.id, m.jugadas, m.abono, m.premios, m.saldo_total
  from clientes c
  left join lateral (
    select mm.saldo_total from movimientos_cliente mm
    where mm.cliente_id = c.id and mm.fecha < p_fecha
    order by mm.fecha desc limit 1
  ) prev on true
  left join movimientos_cliente m on m.cliente_id = c.id and m.fecha = p_fecha
  where c.vendedor_id = auth.uid() and c.activo
  order by c.creado_en;
$$;

-- ───────── Seguridad: cada vendedor solo ve lo suyo ─────────
alter table public.cierres enable row level security;
alter table public.clientes enable row level security;
alter table public.movimientos_cliente enable row level security;
alter table public.bitacora enable row level security;

create policy "cierres - ver" on public.cierres for select using (vendedor_id = auth.uid());
create policy "cierres - crear" on public.cierres for insert with check (vendedor_id = auth.uid());
-- un cierre finalizado ya no se puede modificar
create policy "cierres - editar" on public.cierres for update
  using (vendedor_id = auth.uid() and etapa < 4) with check (vendedor_id = auth.uid());

create policy "clientes - ver" on public.clientes for select using (vendedor_id = auth.uid());
create policy "clientes - crear" on public.clientes for insert with check (vendedor_id = auth.uid());
create policy "clientes - editar" on public.clientes for update
  using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());

create policy "movimientos - ver" on public.movimientos_cliente for select using (vendedor_id = auth.uid());
create policy "movimientos - crear" on public.movimientos_cliente for insert with check (
  vendedor_id = auth.uid()
  and exists (select 1 from public.cierres c where c.id = cierre_id and c.vendedor_id = auth.uid() and c.etapa < 4));
create policy "movimientos - editar" on public.movimientos_cliente for update
  using (vendedor_id = auth.uid()
    and exists (select 1 from public.cierres c where c.id = cierre_id and c.etapa < 4))
  with check (vendedor_id = auth.uid());

create policy "bitacora - ver" on public.bitacora for select using (vendedor_id = auth.uid());
