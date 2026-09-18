// Punto único de acceso a datos. Con variables de Supabase usa la nube;
// sin ellas usa el modo demo (localStorage) con la misma interfaz.
import * as nube from './datosSupabase.js'
import * as demo from './datosDemo.js'

export const modoDemo = !(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const api = modoDemo ? demo : nube

export const {
  iniciarSesion, sesionActual, cerrarSesion,
  obtenerCierre, actualizarCierre,
  listarClientes, agregarCliente, actualizarSaldoInicial, eliminarCliente,
  guardarMovimiento, finalizarCierre,
  listarCierres, movimientosDelCierre,
  listarContado, agregarContado, eliminarContado,
  diasFaltantes, registrarDiasFaltantes, registrarAjuste,
} = api
