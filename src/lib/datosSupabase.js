import { createClient } from '@supabase/supabase-js'
import { diasEntre } from './formato.js'

const url = import.meta.env.VITE_SUPABASE_URL
const llave = import.meta.env.VITE_SUPABASE_ANON_KEY
const dominio = import.meta.env.VITE_DOMINIO_USUARIOS || 'awcounting.local'

const sb = url && llave ? createClient(url, llave) : null

function revisar({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

// Sin sesión = null (undefined significa "todavía cargando" en App)
const aUsuario = (u) => u ? {
  id: u.id,
  usuario: u.email?.split('@')[0],
  nombre: u.user_metadata?.nombre || u.email?.split('@')[0],
} : null

// ───── Sesión ─────
export async function iniciarSesion(usuario, clave) {
  const email = `${usuario.trim().toLowerCase()}@${dominio}`
  const { data, error } = await sb.auth.signInWithPassword({ email, password: clave })
  if (error) throw new Error('Usuario o contraseña incorrectos')
  return aUsuario(data.user)
}

export async function sesionActual() {
  const { data } = await sb.auth.getSession()
  return aUsuario(data.session?.user)
}

export async function cerrarSesion() {
  await sb.auth.signOut()
}

// ───── Cierre del día ─────
// Si quedó un cierre de un día anterior sin finalizar, se termina ese primero;
// el de hoy se habilita cuando no hay pendientes.
export async function obtenerCierre(fecha) {
  const pendiente = revisar(await sb.from('cierres').select('*')
    .lt('fecha', fecha).lt('etapa', 4).order('fecha', { ascending: true }).limit(1).maybeSingle())
  if (pendiente) return pendiente
  const existente = revisar(await sb.from('cierres').select('*').eq('fecha', fecha).maybeSingle())
  if (existente) return existente
  return revisar(await sb.from('cierres').insert({ fecha }).select().single())
}

export async function actualizarCierre(id, cambios) {
  return revisar(await sb.from('cierres').update(cambios).eq('id', id).select().single())
}

// ───── Clientes ─────
export async function listarClientes(fecha) {
  return revisar(await sb.rpc('clientes_del_dia', { p_fecha: fecha }))
}

export async function agregarCliente(nombre, saldoInicial) {
  return revisar(await sb.from('clientes')
    .insert({ nombre: nombre.trim(), saldo_inicial: saldoInicial }).select().single())
}

export async function actualizarSaldoInicial(clienteId, monto) {
  revisar(await sb.from('clientes').update({ saldo_inicial: monto }).eq('id', clienteId))
}

export async function eliminarCliente(clienteId) {
  revisar(await sb.from('clientes')
    .update({ activo: false, eliminado_en: new Date().toISOString() }).eq('id', clienteId))
}

// ───── Movimiento del cliente en el día ─────
export async function guardarMovimiento(m) {
  return revisar(await sb.from('movimientos_cliente').upsert({
    cierre_id: m.cierre_id, cliente_id: m.cliente_id, fecha: m.fecha,
    saldo_anterior: m.saldo_anterior, jugadas: m.jugadas, abono: m.abono, premios: m.premios,
    nota: m.nota ?? null,
  }, { onConflict: 'cliente_id,fecha' }).select().single())
}

// Registra en cero a los clientes sin movimiento (para que el historial no tenga huecos)
// y marca el cierre como finalizado.
export async function finalizarCierre(cierre, clientes) {
  const faltantes = clientes.filter((c) => !c.mov_id).map((c) => ({
    cierre_id: cierre.id, cliente_id: c.id, fecha: cierre.fecha,
    saldo_anterior: c.saldo_anterior, jugadas: 0, abono: 0, premios: 0,
  }))
  if (faltantes.length) revisar(await sb.from('movimientos_cliente').insert(faltantes))
  return actualizarCierre(cierre.id, { etapa: 4, finalizado_en: new Date().toISOString() })
}

// ───── Registros (historial de cierres) ─────
export async function listarCierres() {
  return revisar(await sb.from('cierres').select('*').order('fecha', { ascending: false }))
}

export async function movimientosDelCierre(cierreId) {
  const filas = revisar(await sb.from('movimientos_cliente')
    .select('*, clientes(nombre, activo)').eq('cierre_id', cierreId).order('creado_en'))
  return filas.map(({ clientes, ...m }) => ({ ...m, nombre: clientes?.nombre, activo: clientes?.activo }))
}

// ───── Jugadas de contado ─────
export async function listarContado(cierreId) {
  const filas = revisar(await sb.from('jugadas_contado')
    .select('*, clientes(nombre)').eq('cierre_id', cierreId).order('creado_en'))
  return filas.map(({ clientes, ...j }) => ({ ...j, nombre: clientes?.nombre }))
}

export async function agregarContado(j) {
  return revisar(await sb.from('jugadas_contado').insert({
    cierre_id: j.cierre_id, cliente_id: j.cliente_id, fecha: j.fecha,
    monto: j.monto, tiene_premio: j.tiene_premio, premio: j.tiene_premio ? j.premio : 0,
  }).select().single())
}

export async function eliminarContado(id) {
  revisar(await sb.from('jugadas_contado').delete().eq('id', id))
}

// ───── Retomar después de días sin usar la app ─────
// Solo hay días faltantes si hoy no tiene cierre y no queda ninguno pendiente
export async function diasFaltantes(fecha) {
  const ocupado = revisar(await sb.from('cierres').select('id')
    .or(`fecha.eq.${fecha},and(fecha.lt.${fecha},etapa.lt.4)`).limit(1))
  if (ocupado.length) return []
  const ultimo = revisar(await sb.from('cierres').select('fecha')
    .lt('fecha', fecha).order('fecha', { ascending: false }).limit(1).maybeSingle())
  return ultimo ? diasEntre(ultimo.fecha, fecha) : []
}

export async function registrarDiasFaltantes({ atrasados, sinTrabajo }) {
  const ahora = new Date().toISOString()
  const filas = [
    ...atrasados.map((fecha) => ({ fecha, tipo: 'atrasado' })),
    ...sinTrabajo.map((fecha) => ({ fecha, tipo: 'sin_trabajo', etapa: 4, finalizado_en: ahora })),
  ]
  if (filas.length) revisar(await sb.from('cierres').insert(filas))
}

export async function registrarAjuste(fecha, saldos, nota) {
  return revisar(await sb.rpc('registrar_ajuste', { p_fecha: fecha, p_saldos: saldos, p_nota: nota }))
}
