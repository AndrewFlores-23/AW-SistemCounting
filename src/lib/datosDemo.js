// Modo demo: imita el esquema de Supabase dentro de localStorage.
// Sirve para ver y probar el flujo antes de conectar el proyecto real.
import { saldoDe, balanceDe } from './formato.js'

const CLAVE = 'aw_demo_db_v1'
const USUARIOS = [
  { id: 'u-demo', usuario: 'demo', clave: '1234', nombre: 'Vendedor Demo' },
]

const leer = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) ?? vacia()
  } catch {
    return vacia()
  }
}
const vacia = () => ({ sesion: null, cierres: [], clientes: [], movimientos: [], bitacora: [] })
const escribir = (db) => localStorage.setItem(CLAVE, JSON.stringify(db))
const id = () => crypto.randomUUID()
const espera = () => new Promise((r) => setTimeout(r, 120))

function anotar(db, tabla, accion, antes, despues) {
  db.bitacora.push({
    tabla, accion, antes, despues,
    vendedor_id: db.sesion, registro_id: (despues ?? antes).id, creado_en: new Date().toISOString(),
  })
}

export async function iniciarSesion(usuario, clave) {
  await espera()
  const u = USUARIOS.find((x) => x.usuario === usuario.trim().toLowerCase() && x.clave === clave)
  if (!u) throw new Error('Usuario o contraseña incorrectos')
  const db = leer(); db.sesion = u.id; escribir(db)
  return { id: u.id, usuario: u.usuario, nombre: u.nombre }
}

export async function sesionActual() {
  const u = USUARIOS.find((x) => x.id === leer().sesion)
  return u ? { id: u.id, usuario: u.usuario, nombre: u.nombre } : null
}

export async function cerrarSesion() {
  const db = leer(); db.sesion = null; escribir(db)
}

export async function obtenerCierre(fecha) {
  await espera()
  const db = leer()
  let c = db.cierres.find((x) => x.vendedor_id === db.sesion && x.fecha === fecha)
  if (!c) {
    c = { id: id(), vendedor_id: db.sesion, fecha, ventas: 0, comision: 0, premios: 0, balance: 0, etapa: 1 }
    db.cierres.push(c); anotar(db, 'cierres', 'INSERT', null, c); escribir(db)
  }
  return c
}

export async function actualizarCierre(cierreId, cambios) {
  const db = leer()
  const i = db.cierres.findIndex((x) => x.id === cierreId)
  if (db.cierres[i].etapa >= 4) throw new Error('Este cierre ya fue finalizado')
  const antes = db.cierres[i]
  const despues = { ...antes, ...cambios }
  despues.balance = balanceDe(despues)
  db.cierres[i] = despues
  anotar(db, 'cierres', 'UPDATE', antes, despues); escribir(db)
  return despues
}

export async function listarClientes(fecha) {
  await espera()
  const db = leer()
  return db.clientes
    .filter((c) => c.vendedor_id === db.sesion && c.activo)
    .map((c) => {
      const previos = db.movimientos
        .filter((m) => m.cliente_id === c.id && m.fecha < fecha)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
      const hoy = db.movimientos.find((m) => m.cliente_id === c.id && m.fecha === fecha)
      return {
        id: c.id, nombre: c.nombre, saldo_inicial: c.saldo_inicial,
        tiene_historial: previos.length > 0,
        saldo_anterior: previos.length ? previos[0].saldo_total : c.saldo_inicial,
        mov_id: hoy?.id ?? null, jugadas: hoy?.jugadas ?? null, abono: hoy?.abono ?? null,
        premios: hoy?.premios ?? null, saldo_total: hoy?.saldo_total ?? null, nota: hoy?.nota ?? null,
        nota_anterior: previos[0]?.nota?.trim() || null, fecha_nota_anterior: previos[0]?.fecha ?? null,
      }
    })
}

export async function agregarCliente(nombre, saldoInicial) {
  const db = leer()
  const c = {
    id: id(), vendedor_id: db.sesion, nombre: nombre.trim(), saldo_inicial: saldoInicial,
    activo: true, creado_en: new Date().toISOString(),
  }
  db.clientes.push(c); anotar(db, 'clientes', 'INSERT', null, c); escribir(db)
  return c
}

export async function actualizarSaldoInicial(clienteId, monto) {
  const db = leer()
  const c = db.clientes.find((x) => x.id === clienteId)
  const antes = { ...c }
  c.saldo_inicial = monto
  anotar(db, 'clientes', 'UPDATE', antes, { ...c }); escribir(db)
}

export async function eliminarCliente(clienteId) {
  const db = leer()
  const c = db.clientes.find((x) => x.id === clienteId)
  const antes = { ...c }
  c.activo = false; c.eliminado_en = new Date().toISOString()
  anotar(db, 'clientes', 'UPDATE', antes, { ...c }); escribir(db)
}

export async function guardarMovimiento(m) {
  const db = leer()
  const fila = { ...m, vendedor_id: db.sesion, saldo_total: saldoDe(m) }
  delete fila.id
  const i = db.movimientos.findIndex((x) => x.cliente_id === m.cliente_id && x.fecha === m.fecha)
  if (i >= 0) {
    const antes = db.movimientos[i]
    db.movimientos[i] = { ...antes, ...fila }
    anotar(db, 'movimientos_cliente', 'UPDATE', antes, db.movimientos[i])
  } else {
    fila.id = id()
    db.movimientos.push(fila)
    anotar(db, 'movimientos_cliente', 'INSERT', null, fila)
  }
  escribir(db)
  return db.movimientos[i >= 0 ? i : db.movimientos.length - 1]
}

export async function finalizarCierre(cierre, clientes) {
  for (const c of clientes.filter((x) => !x.mov_id)) {
    await guardarMovimiento({
      cierre_id: cierre.id, cliente_id: c.id, fecha: cierre.fecha,
      saldo_anterior: c.saldo_anterior, jugadas: 0, abono: 0, premios: 0,
    })
  }
  return actualizarCierre(cierre.id, { etapa: 4, finalizado_en: new Date().toISOString() })
}

export async function listarCierres() {
  await espera()
  const db = leer()
  return db.cierres
    .filter((c) => c.vendedor_id === db.sesion)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export async function movimientosDelCierre(cierreId) {
  await espera()
  const db = leer()
  return db.movimientos
    .filter((m) => m.cierre_id === cierreId)
    .map((m) => {
      const c = db.clientes.find((x) => x.id === m.cliente_id)
      return { ...m, nombre: c?.nombre, activo: c?.activo }
    })
}
