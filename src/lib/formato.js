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
  redondear(aNumero(m.saldo_anterior) + aNumero(m.jugadas) - aNumero(m.abono) - aNumero(m.premios))
