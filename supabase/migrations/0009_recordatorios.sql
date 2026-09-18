-- Recordatorios que salen de las notas de los clientes (una por nota).
-- La fecha y la hora las detecta la app al leer la nota; sin fecha, queda para el día siguiente.
create table public.recordatorios (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  movimiento_id uuid not null unique references public.movimientos_cliente(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  texto text not null,
  fecha date not null,
  hora time,
  hecho boolean not null default false,
  hecho_en timestamptz,
  creado_en timestamptz not null default now()
);
create index on public.recordatorios (vendedor_id, hecho, fecha);

create trigger bitacora_recordatorios after insert or update or delete on public.recordatorios
  for each row execute function public.registrar_bitacora();

alter table public.recordatorios enable row level security;
create policy "recordatorios - ver" on public.recordatorios for select using (vendedor_id = auth.uid());
create policy "recordatorios - crear" on public.recordatorios for insert with check (vendedor_id = auth.uid());
create policy "recordatorios - editar" on public.recordatorios for update
  using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());
create policy "recordatorios - borrar" on public.recordatorios for delete using (vendedor_id = auth.uid());

-- Consultas por rango de fechas para el resumen del mes y el promedio de los clientes
create index if not exists movimientos_vendedor_fecha on public.movimientos_cliente (vendedor_id, fecha);
create index if not exists contado_vendedor_fecha on public.jugadas_contado (vendedor_id, fecha);
