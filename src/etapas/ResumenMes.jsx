import { useEffect, useState } from 'react'
import * as datos from '../lib/datos.js'
import { dinero, fechaCorta, hoyCR } from '../lib/formato.js'
import { resumirMes } from '../lib/analisis.js'
import { Cargando } from '../componentes.jsx'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre']

function limitesMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  const fin = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return [`${mes}-01`, `${mes}-${String(fin).padStart(2, '0')}`, fin]
}
const moverMes = (mes, n) => {
  const [a, m] = mes.split('-').map(Number)
  const f = new Date(Date.UTC(a, m - 1 + n, 1))
  return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}`
}
const nombreMes = (mes) => { const [a, m] = mes.split('-').map(Number); return `${MESES[m - 1]} ${a}` }

export default function ResumenMes() {
  const mesActual = hoyCR().slice(0, 7)
  const [mes, setMes] = useState(mesActual)
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    setResumen(null)
    const [desde, hasta] = limitesMes(mes)
    Promise.all([datos.cierresEntre(desde, hasta), datos.movimientosEntre(desde, hasta), datos.contadoEntre(desde, hasta)])
      .then(([c, m, j]) => vigente && setResumen(resumirMes(c, m, j)))
      .catch((e) => vigente && setError(e.message))
    return () => { vigente = false }
  }, [mes])

  const [, , diasDelMes] = limitesMes(mes)
  const porDia = Array.from({ length: diasDelMes }, (_, i) => {
    const fecha = `${mes}-${String(i + 1).padStart(2, '0')}`
    const d = resumen?.porDia.find((x) => x.fecha === fecha)
    return { etiqueta: String(i + 1), valor: d?.ventas ?? 0, detalle: `${fechaCorta(fecha)}: ${d ? dinero(d.ventas) : 'sin cierre'}` }
  })

  return (
    <div className="resumen-mes">
      <div className="selector-mes">
        <button className="btn fantasma" onClick={() => setMes(moverMes(mes, -1))} aria-label="Mes anterior">‹</button>
        <b>{nombreMes(mes)}</b>
        <button className="btn fantasma" onClick={() => setMes(moverMes(mes, 1))} disabled={mes >= mesActual} aria-label="Mes siguiente">›</button>
      </div>

      {error && <p className="aviso error">{error}</p>}
      {!resumen && !error && <Cargando texto="Sumando el mes…" />}
      {resumen && resumen.diasTrabajados === 0 && <p className="vacio">No hay cierres finalizados en {nombreMes(mes)}.</p>}

      {resumen && resumen.diasTrabajados > 0 && (
        <>
          <div className="tarjeta kpi-principal">
            <small>Ventas del mes</small>
            <strong>{dinero(resumen.ventas)}</strong>
            <span>{resumen.diasTrabajados} días trabajados · promedio {dinero(resumen.promedioDiario)} por día</span>
          </div>
          <div className="kpis">
            <div className="kpi"><small>Comisión</small><b>{dinero(resumen.comision)}</b></div>
            <div className="kpi"><small>Premios</small><b>{dinero(resumen.premios)}</b></div>
            <div className="kpi"><small>Balance</small><b className={resumen.balance < 0 ? 'negativo' : ''}>{dinero(resumen.balance)}</b></div>
          </div>

          <div className="tarjeta">
            <h4>Lo más destacado</h4>
            {resumen.mejorSemana && (
              <Destacado titulo="Día de la semana más fuerte" valor={resumen.mejorSemana.dia}
                detalle={`promedio ${dinero(resumen.mejorSemana.promedio)}`} />
            )}
            {resumen.mejorDia && (
              <Destacado titulo="Día de más ventas" valor={fechaCorta(resumen.mejorDia.fecha)}
                detalle={dinero(resumen.mejorDia.ventas)} />
            )}
            {resumen.diaMasJugadas && (
              <Destacado titulo="Día que más números compraron" valor={fechaCorta(resumen.diaMasJugadas.fecha)}
                detalle={`${dinero(resumen.diaMasJugadas.total)} en jugadas`} />
            )}
          </div>

          <div className="tarjeta">
            <h4>Promedio de ventas por día de la semana</h4>
            <Columnas datos={resumen.semana.map((s) => ({
              etiqueta: s.corto, valor: s.promedio,
              detalle: s.dias ? `${s.dia}: ${dinero(s.promedio)} (${s.dias} ${s.dias === 1 ? 'día' : 'días'})` : `${s.dia}: sin ventas`,
            }))} />
          </div>

          <div className="tarjeta">
            <h4>Ventas de cada día</h4>
            <Columnas datos={porDia} fino etiquetaCada={5} />
          </div>

          {resumen.clientes.length > 0 && (
            <div className="tarjeta">
              <h4>Clientes que más compraron</h4>
              <ol className="ranking">
                {resumen.clientes.map((c) => (
                  <li key={c.id}>
                    <span className="ranking-nombre">{c.nombre}</span>
                    <span className="ranking-barra" aria-hidden="true">
                      <i style={{ width: `${(c.total / resumen.clientes[0].total) * 100}%` }} />
                    </span>
                    <b>{dinero(c.total)}</b>
                  </li>
                ))}
              </ol>
              <small className="panel-pie">Jugadas a crédito más jugadas de contado.</small>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Destacado({ titulo, valor, detalle }) {
  return (
    <div className="destacado">
      <small>{titulo}</small>
      <p><b>{valor}</b> · {detalle}</p>
    </div>
  )
}

// Columnas de una sola serie: el valor más alto lleva su monto; el resto, al tocar
function Columnas({ datos, fino, etiquetaCada = 1 }) {
  const max = Math.max(...datos.map((d) => d.valor), 0)
  const iMax = datos.findIndex((d) => d.valor === max && max > 0)
  return (
    <>
      <div className={`columnas ${fino ? 'fino' : ''}`} role="img"
        aria-label={datos.map((d) => d.detalle).join('; ')}>
        {datos.map((d, i) => (
          <div key={i} className="columna" tabIndex={0} aria-label={d.detalle}>
            {i === iMax && !fino && <span className="columna-valor">{dinero(d.valor)}</span>}
            <span className={`columna-barra ${i === iMax ? 'max' : ''}`}
              style={{ height: max ? `${Math.max((d.valor / max) * 100, d.valor ? 3 : 0)}%` : 0 }} />
            <span className="columna-tip" role="tooltip">{d.detalle}</span>
            <small className="columna-etiqueta">{(i + 1) % etiquetaCada === 0 || i === 0 || !fino ? d.etiqueta : ''}</small>
          </div>
        ))}
      </div>
      <details className="ver-tabla">
        <summary>Ver en tabla</summary>
        <ul>{datos.map((d, i) => <li key={i}>{d.detalle}</li>)}</ul>
      </details>
    </>
  )
}
