-- Jugadas de contado: lista aparte y opcional dentro de la etapa 2.
-- No afecta el saldo del cliente (se pagan en efectivo ese día).
create table public.jugadas_contado (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cierre_id uuid not null references public.cierres(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  fecha date not null,
  monto numeric(14,2) not null check (monto > 0),
  tiene_premio boolean not null default false,
  premio numeric(14,2) not null default 0 check (premio >= 0),
  neto numeric(14,2) generated always as (monto - premio) stored,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (tiene_premio or premio = 0)
);
create index on public.jugadas_contado (cierre_id);
create index on public.jugadas_contado (cliente_id, fecha);

create trigger contado_actualizado before update on public.jugadas_contado
  for each row execute function public.tocar_actualizado();
create trigger bitacora_contado after insert or update or delete on public.jugadas_contado
  for each row execute function public.registrar_bitacora();

alter table public.jugadas_contado enable row level security;

-- Solo se puede escribir mientras el cierre de ese día no esté finalizado
create policy "contado - ver" on public.jugadas_contado for select using (vendedor_id = auth.uid());
create policy "contado - crear" on public.jugadas_contado for insert with check (
  vendedor_id = auth.uid()
  and exists (select 1 from public.cierres c where c.id = cierre_id and c.vendedor_id = auth.uid() and c.etapa < 4));
create policy "contado - editar" on public.jugadas_contado for update
  using (vendedor_id = auth.uid()
    and exists (select 1 from public.cierres c where c.id = cierre_id and c.etapa < 4))
  with check (vendedor_id = auth.uid());
create policy "contado - borrar" on public.jugadas_contado for delete
  using (vendedor_id = auth.uid()
    and exists (select 1 from public.cierres c where c.id = cierre_id and c.etapa < 4));
