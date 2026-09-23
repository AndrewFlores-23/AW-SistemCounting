// Punto único de acceso a datos. Con variables de Supabase usa la nube;
// sin ellas usa el modo demo (localStorage) con la misma interfaz.
import * as nube from './datosSupabase.js'
import * as demo from './datosDemo.js'

export const modoDemo = !(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const api = modoDemo ? demo : nube

// Las listas de clientes siempre van en orden alfabético
const porNombre = (a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' })
export const listarClientes = async (fecha) => (await api.listarClientes(fecha)).sort(porNombre)
export const movimientosDelCierre = async (cierreId) => (await api.movimientosDelCierre(cierreId)).sort(porNombre)

export const {
  iniciarSesion, sesionActual, cerrarSesion,
  obtenerCierre, actualizarCierre,
  agregarCliente, actualizarSaldoInicial, eliminarCliente,
  guardarMovimiento, finalizarCierre,
  listarCierres,
  listarContado, agregarContado, eliminarContado,
  diasFaltantes, registrarDiasFaltantes, registrarAjuste,
  guardarRecordatorio, quitarRecordatorio, listarRecordatorios, marcarRecordatorio,
  cierresEntre, movimientosEntre, contadoEntre,
} = api
