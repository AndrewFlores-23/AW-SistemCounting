# AW_SistemCounting

Cierre diario de cuentas para vendedores de tiempos digitales.

**Flujo:** inicio de sesión → 1. ventas, comisión y premios (balance) → 2. clientes (saldo anterior, jugadas, abono, premios) → 3. resumen y confirmación → "Fin del cierre de hoy".

- El día se calcula con la hora de Costa Rica.
- Cada cambio se guarda solo (Supabase), así que se puede seguir desde cualquier dispositivo.
- El saldo total de cada cliente pasa a ser su saldo anterior del siguiente día.
- La tabla `bitacora` guarda cada cambio (antes y después) para el historial.

## Desarrollo

```bash
npm install
npm run dev
```

Sin `.env` corre en **modo demo** (usuario `demo`, contraseña `1234`, datos solo en el navegador).

## Supabase

1. Ejecutar `supabase/migrations/0001_esquema_inicial.sql`.
2. En Authentication desactivar el registro público y crear cada usuario con correo `<usuario>@awcounting.local` y metadata `{"nombre": "Nombre visible"}`.
3. Copiar `.env.example` a `.env` con la URL y la llave publicable. Para GitHub Pages, crear las mismas como *Variables* del repositorio.
