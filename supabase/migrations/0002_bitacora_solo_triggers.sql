-- La bitácora solo se escribe desde los triggers, nunca por la API
revoke execute on function public.registrar_bitacora() from public, anon, authenticated;
revoke execute on function public.clientes_del_dia(date) from anon;
