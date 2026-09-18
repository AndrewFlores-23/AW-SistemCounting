// Detecta fechas y horas escritas en una nota ("el viernes", "mañana a las 3",
// "15 de octubre", "15/10", "fin de mes"…) relativas al día del cierre.
// Sin fecha en la nota, el recordatorio queda para el día siguiente.

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre']
const NUMEROS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15 }

const normalizar = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/setiembre/g, 'septiembre')

const aFecha = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d)) }
const aIso = (f) => f.toISOString().slice(0, 10)
const mas = (iso, n) => { const f = aFecha(iso); f.setUTCDate(f.getUTCDate() + n); return aIso(f) }
const ultimoDelMes = (a, m) => new Date(Date.UTC(a, m + 1, 0)).getUTCDate()

// Fecha válida con día y mes; si ya pasó respecto a la base, se toma el próximo año
function fechaDiaMes(base, dia, mes, anio) {
  const b = aFecha(base)
  let a = anio ?? b.getUTCFullYear()
  if (dia < 1 || mes < 0 || mes > 11 || dia > ultimoDelMes(a, mes)) return null
  let iso = aIso(new Date(Date.UTC(a, mes, dia)))
  if (!anio && iso < base) iso = aIso(new Date(Date.UTC(a + 1, mes, Math.min(dia, ultimoDelMes(a + 1, mes)))))
  return iso
}

function buscarFecha(t, base) {
  const b = aFecha(base)
  const candidatos = []
  const agregar = (m, fecha) => { if (m && fecha) candidatos.push({ pos: m.index, fecha }) }

  let m
  if ((m = /\bpasado\s+manana\b/.exec(t))) agregar(m, mas(base, 2))
  // "mañana" como día (no "en la mañana" / "de la mañana")
  const reManana = /(?<!\bla\s)(?<!\bpasado\s)\bmanana\b/g
  while ((m = reManana.exec(t))) agregar(m, mas(base, 1))
  if ((m = /\bhoy\b/.exec(t))) agregar(m, base)

  if ((m = /\b(?:en|dentro\s+de)\s+(\d{1,2}|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince)\s+dias?\b/.exec(t))) {
    agregar(m, mas(base, Number(m[1]) || NUMEROS[m[1]]))
  }
  if ((m = /\b(?:en|dentro\s+de)\s+(\d|un|una|dos|tres)\s+semanas?\b/.exec(t))) {
    agregar(m, mas(base, 7 * (Number(m[1]) || NUMEROS[m[1]])))
  }
  if ((m = /\b(?:la\s+(?:otra|proxima|siguiente)\s+semana|la\s+semana\s+que\s+viene)\b/.exec(t))) agregar(m, mas(base, 7))
  if ((m = /\bfin(?:al)?\s+de(?:l)?\s+mes\b/.exec(t))) {
    agregar(m, aIso(new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + 1, 0))))
  }

  // Días de la semana: la próxima vez que caiga ese día después de la base
  const reDia = /\b(?:el\s+|este\s+|proximo\s+|el\s+proximo\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/g
  while ((m = reDia.exec(t))) {
    const objetivo = DIAS.indexOf(m[1])
    let dif = (objetivo - b.getUTCDay() + 7) % 7
    if (dif === 0) dif = 7
    agregar(m, mas(base, dif))
  }

  // "15 de octubre", "15 de octubre de 2026"
  const reMes = new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${MESES.join('|')})(?:\\s+(?:de|del)\\s+(\\d{4}))?\\b`, 'g')
  while ((m = reMes.exec(t))) agregar(m, fechaDiaMes(base, Number(m[1]), MESES.indexOf(m[2]), m[3] && Number(m[3])))

  // "15/10", "15-10-2026"
  const reNum = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/g
  while ((m = reNum.exec(t))) {
    const anio = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : undefined
    agregar(m, fechaDiaMes(base, Number(m[1]), Number(m[2]) - 1, anio))
  }

  // "el 15", "el día 15" (sin mes): la próxima vez que llegue ese día del mes
  const reDiaMes = new RegExp(`\\bel\\s+(?:dia\\s+)?(\\d{1,2})\\b(?!\\s*(?:mil|de\\s+(?:la|el|${MESES.join('|')})\\b|[/:-]|\\d|%))`, 'g')
  while ((m = reDiaMes.exec(t))) {
    const dia = Number(m[1])
    if (dia < 1 || dia > 31) continue
    let a = b.getUTCFullYear(); let mes = b.getUTCMonth()
    if (dia <= b.getUTCDate()) { mes += 1; if (mes > 11) { mes = 0; a += 1 } }
    agregar(m, fechaDiaMes(base, Math.min(dia, ultimoDelMes(a, mes)), mes, a))
  }

  candidatos.sort((x, y) => x.pos - y.pos)
  return candidatos[0]?.fecha ?? null
}

function buscarHora(t) {
  let m = /\b(?:a\s+las?\s+|tipo\s+|como\s+a\s+las?\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.\s?m\.|p\.\s?m\.)\b/.exec(t)
    ?? /\ba\s+las?\s+(\d{1,2})(?::(\d{2}))?\b(?!\s*(?:mil|de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)))/.exec(t)
    ?? /\b(\d{1,2}):(\d{2})\b/.exec(t)
  if (!m) return null
  let h = Number(m[1]); const min = Number(m[2] ?? 0)
  const sufijo = (m[3] ?? '').replace(/[\s.]/g, '')
  const resto = t.slice(m.index)
  if (h > 23 || min > 59) return null
  if (sufijo === 'pm' || /de\s+la\s+(tarde|noche)/.test(resto.slice(0, 40))) { if (h < 12) h += 12 }
  else if (sufijo === 'am' || /de\s+la\s+manana/.test(resto.slice(0, 40))) { if (h === 12) h = 0 }
  else if (h >= 1 && h <= 6) h += 12 // "a las 3" en horario de venta suele ser de la tarde
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function detectarRecordatorio(texto, fechaBase) {
  const t = normalizar(texto ?? '')
  const fecha = buscarFecha(t, fechaBase)
  const hora = buscarHora(t)
  return { fecha: fecha ?? mas(fechaBase, 1), hora, detectada: Boolean(fecha) }
}

export function horaBonita(hora) {
  if (!hora) return ''
  const [h, m] = hora.split(':').map(Number)
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`
}
