import { aNumero, redondear, sumarDias } from './formato.js'

// Cuenta alta: el saldo equivale a varios días de lo que el cliente juega en promedio
export const DIAS_CUENTA_ALTA = 7
const DIAS_HISTORIAL_MINIMO = 3
export const DIAS_PROMEDIO = 30

// Promedio de jugadas por día de cada cliente (días con registro en el período)
export function promediosClientes(movimientos) {
  const porCliente = new Map()
  for (const m of movimientos) {
    const p = porCliente.get(m.cliente_id) ?? { dias: 0, total: 0 }
    p.dias += 1
    p.total += aNumero(m.jugadas)
    porCliente.set(m.cliente_id, p)
  }
  const salida = {}
  for (const [id, p] of porCliente) salida[id] = { dias: p.dias, promedio: redondear(p.total / p.dias) }
  return salida
}

// Clientes cuyo saldo actual es alto comparado con lo que juegan
export function cuentasAltas(clientes, promedios) {
  return clientes
    .map((c) => {
      const saldo = aNumero(c.saldo_total ?? c.saldo_anterior)
      const p = promedios[c.id]
      if (!p || p.dias < DIAS_HISTORIAL_MINIMO || p.promedio <= 0 || saldo <= 0) return null
      const dias = saldo / p.promedio
      return dias >= DIAS_CUENTA_ALTA ? { id: c.id, nombre: c.nombre, saldo, promedio: p.promedio, dias: Math.round(dias) } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.dias - a.dias)
}

export const rangoPromedio = (hoy) => [sumarDias(hoy, -DIAS_PROMEDIO), sumarDias(hoy, -1)]

// ───── Resumen del mes ─────
const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0] // lunes primero

const diaSemana = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d)).getUTCDay() }

export function resumirMes(cierres, movimientos, contado) {
  // Solo días de venta ya finalizados (sin ajustes ni días libres)
  const dias = cierres.filter((c) => c.etapa === 4 && (c.tipo ?? 'normal') !== 'sin_trabajo' && c.tipo !== 'ajuste')
  const total = (campo) => redondear(dias.reduce((t, c) => t + aNumero(c[campo]), 0))

  const semana = ORDEN_SEMANA.map((d) => {
    const del = dias.filter((c) => diaSemana(c.fecha) === d)
    const suma = del.reduce((t, c) => t + aNumero(c.ventas), 0)
    return { dia: NOMBRES_DIA[d], corto: NOMBRES_DIA[d].slice(0, 3), dias: del.length, promedio: del.length ? Math.round(suma / del.length) : 0 }
  })
  const mejorSemana = semana.reduce((a, b) => (b.promedio > a.promedio ? b : a), semana[0])

  // Números comprados por día: jugadas a crédito + de contado
  const jugadasPorFecha = new Map()
  const sumarJugada = (fecha, monto) => jugadasPorFecha.set(fecha, (jugadasPorFecha.get(fecha) ?? 0) + aNumero(monto))
  movimientos.forEach((m) => sumarJugada(m.fecha, m.jugadas))
  contado.forEach((j) => sumarJugada(j.fecha, j.monto))
  const diaMasJugadas = [...jugadasPorFecha].sort((a, b) => b[1] - a[1])[0]

  const porCliente = new Map()
  const sumarCliente = (id, nombre, monto) => {
    const c = porCliente.get(id) ?? { id, nombre, total: 0 }
    c.total += aNumero(monto)
    porCliente.set(id, c)
  }
  movimientos.forEach((m) => sumarCliente(m.cliente_id, m.nombre, m.jugadas))
  contado.forEach((j) => sumarCliente(j.cliente_id, j.nombre, j.monto))
  const clientes = [...porCliente.values()].filter((c) => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5)

  const ventas = total('ventas')
  return {
    ventas, comision: total('comision'), premios: total('premios'), balance: total('balance'),
    diasTrabajados: dias.length,
    promedioDiario: dias.length ? Math.round(ventas / dias.length) : 0,
    porDia: dias.map((c) => ({ fecha: c.fecha, ventas: aNumero(c.ventas) })),
    semana, mejorSemana: mejorSemana?.promedio > 0 ? mejorSemana : null,
    mejorDia: dias.length ? dias.reduce((a, b) => (aNumero(b.ventas) > aNumero(a.ventas) ? b : a)) : null,
    diaMasJugadas: diaMasJugadas && diaMasJugadas[1] > 0 ? { fecha: diaMasJugadas[0], total: redondear(diaMasJugadas[1]) } : null,
    clientes,
  }
}
