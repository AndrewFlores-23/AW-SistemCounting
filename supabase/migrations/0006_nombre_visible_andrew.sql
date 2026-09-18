-- Nombre visible de la cuenta de Andrew (la cuenta se crea a mano en Authentication)
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"nombre": "Andrew Flores"}'::jsonb
where email = 'andrewflores@awcounting.local';
