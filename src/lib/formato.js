const ZONA_CR = 'America/Costa_Rica'

// Fecha de hoy en Costa Rica como 'AAAA-MM-DD', sin importar la zona del dispositivo
export function hoyCR() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_CR }).format(new Date())
}

export function fechaLarga(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  const texto = new Intl.DateTimeFormat('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(new Date(Date.UTC(a, m - 1, d)))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// 'martes 16'
export function fechaCorta(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CR', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(a, m - 1, d)))
}

// Nota vacía o solo espacios = sin nota
export const limpiarNota = (t) => (t ?? '').trim() || null

const colones = new Intl.NumberFormat('es-CR', {
  style: 'currency', currency: 'CRC', minimumFractionDigits: 0, maximumFractionDigits: 2,
})
export const dinero = (n) => colones.format(Number(n) || 0)

// Convierte lo que escribe el usuario ("12 500", "1,5") en número
export function aNumero(texto) {
  if (typeof texto === 'number') return texto
  const limpio = String(texto ?? '').replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(limpio)
  return Number.isFinite(n) ? n : 0
}

export const redondear = (n) => Math.round(n * 100) / 100
export const balanceDe = (c) => redondear(aNumero(c.ventas) - aNumero(c.comision) - aNumero(c.premios))
export const saldoDe = (m) =>
  redondear(aNumero(m.saldo_anterior) + aNumero(m.jugadas) - aNumero(m.abono) - aNumero(m.premios) + aNumero(m.ajuste))

// Agrupa las jugadas de contado por cliente y saca los totales del día
export function resumirContado(jugadas) {
  const porCliente = new Map()
  for (const j of jugadas) {
    const g = porCliente.get(j.cliente_id) ?? { cliente_id: j.cliente_id, nombre: j.nombre, jugadas: 0, monto: 0, premio: 0, neto: 0 }
    g.jugadas += 1
    g.monto += Number(j.monto)
    g.premio += Number(j.premio)
    g.neto += Number(j.monto) - Number(j.premio)
    porCliente.set(j.cliente_id, g)
  }
  const clientes = [...porCliente.values()]
  const total = (campo) => redondear(clientes.reduce((t, c) => t + c[campo], 0))
  return { clientes, monto: total('monto'), premio: total('premio'), neto: total('neto'), cantidad: jugadas.length }
}

// Compara lo anotado en la etapa 1 con lo registrado en la etapa 2:
// jugadas de clientes + contado = ventas; premios de clientes + contado = premios
export function calcularCuadre(cierre, clientes, contado) {
  const c = resumirContado(contado)
  const sumar = (campo) => redondear(clientes.reduce((t, x) => t + aNumero(x[campo]), 0))
  const fila = (anotado, deClientes, deContado) => {
    const registrado = redondear(deClientes + deContado)
    return { anotado: aNumero(anotado), registrado, clientes: deClientes, contado: deContado, diferencia: redondear(registrado - aNumero(anotado)) }
  }
  const ventas = fila(cierre.ventas, sumar('jugadas'), c.monto)
  const premios = fila(cierre.premios, sumar('premios'), c.premio)
  // Positivo = sobra dinero; negativo = hace falta
  const dinero = redondear(ventas.diferencia - premios.diferencia)
  return { ventas, premios, dinero, cuadra: ventas.diferencia === 0 && premios.diferencia === 0 }
}

// Suma (o resta) días a una fecha 'AAAA-MM-DD'
export function sumarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10)
}

// Días sin cierre entre el último registrado y hoy (sin incluir ninguno de los dos)
export function diasEntre(ultimo, hoy) {
  const dias = []
  for (let f = sumarDias(ultimo, 1); f < hoy; f = sumarDias(f, 1)) dias.push(f)
  return dias
}
