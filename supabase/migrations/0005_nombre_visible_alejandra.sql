-- Nombre visible de la primera vendedora (la cuenta se crea a mano en Authentication)
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"nombre": "Alejandra"}'::jsonb
where email = 'alejandra@awcounting.local';
