-- Casilla "Depósito" también en las jugadas de contado: el vendedor confirma
-- que el pago ya está en la cuenta. Es solo de control; no cambia montos.
-- Se puede marcar mientras el cierre no esté finalizado (política "contado - editar").
alter table public.jugadas_contado add column deposito boolean not null default false;
