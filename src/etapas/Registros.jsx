import { useEffect, useState } from 'react'
import * as datos from '../lib/datos.js'
import { dinero, fechaLarga } from '../lib/formato.js'
import { Cargando, Fila } from '../componentes.jsx'

const NOMBRE_ETAPA = { 1: 'En ventas', 2: 'En clientes', 3: 'En resumen' }

export default function Registros({ onVolver }) {
  const [cierres, setCierres] = useState(null)
  const [elegido, setElegido] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    datos.listarCierres().then(setCierres).catch((e) => setError(e.message))
  }, [])

  if (elegido) return <DetalleCierre cierre={elegido} onVolver={() => setElegido(null)} />

  return (
    <section className="etapa aparecer">
      <button className="btn fantasma volver" onClick={onVolver}>← Volver al cierre</button>
      <h2>Registros</h2>
      {error && <p className="aviso error">{error}</p>}
      {cierres === null && !error && <Cargando texto="Buscando registros…" />}
      {cierres?.length === 0 && <p className="vacio">Todavía no hay cierres guardados.</p>}

      <ul className="lista-registros">
        {cierres?.map((c) => (
          <li key={c.id}>
            <button className="registro" onClick={() => setElegido(c)}>
              <span className="registro-fecha">
                {fechaLarga(c.fecha)}{' '}
                {c.etapa === 4
                  ? <em className="etiqueta ok">Finalizado</em>
                  : <em className="etiqueta pendiente">{NOMBRE_ETAPA[c.etapa]}</em>}
              </span>
              <span className={`registro-balance ${c.balance < 0 ? 'negativo' : ''}`}>{dinero(c.balance)}</span>
              <span className="registro-detalle">
                <span>Ventas {dinero(c.ventas)}</span>
                <span>Comisión {dinero(c.comision)}</span>
                <span>Premios {dinero(c.premios)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DetalleCierre({ cierre, onVolver }) {
  const [movs, setMovs] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    datos.movimientosDelCierre(cierre.id).then(setMovs).catch((e) => setError(e.message))
  }, [cierre.id])

  const suma = (campo) => (movs ?? []).reduce((t, m) => t + Number(m[campo] || 0), 0)

  return (
    <section className="etapa aparecer">
      <button className="btn fantasma volver" onClick={onVolver}>← Todos los registros</button>
      <h2>{fechaLarga(cierre.fecha)}</h2>
      {cierre.etapa < 4 && <p className="subtitulo">Cierre sin finalizar</p>}
      {error && <p className="aviso error">{error}</p>}

      <div className="tarjeta">
        <h4>Ventas</h4>
        <Fila etiqueta="Ventas" valor={dinero(cierre.ventas)} />
        <Fila etiqueta="Comisión" valor={`− ${dinero(cierre.comision)}`} />
        <Fila etiqueta="Premios" valor={`− ${dinero(cierre.premios)}`} />
        <Fila etiqueta="Balance" valor={dinero(cierre.balance)} fuerte />
      </div>

      <div className="tarjeta">
        <h4>Clientes {movs && <small>({movs.length})</small>}</h4>
        {movs === null && !error && <Cargando texto="Cargando clientes…" />}
        {movs?.length === 0 && <p className="vacio">Sin movimientos de clientes ese día.</p>}
        {movs?.length > 0 && (
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr><th>Cliente</th><th>Anterior</th><th>Jugadas</th><th>Abono</th><th>Premios</th><th>Saldo</th></tr>
              </thead>
              <tbody>
                {movs.map((m) => (
                  <tr key={m.id}>
                    <td className={m.activo === false ? 'eliminado' : ''}>
                      {m.nombre}{m.activo === false && ' (eliminado)'}
                    </td>
                    <td>{dinero(m.saldo_anterior)}</td>
                    <td>{dinero(m.jugadas)}</td>
                    <td>{dinero(m.abono)}</td>
                    <td>{dinero(m.premios)}</td>
                    <td className={m.saldo_total < 0 ? 'negativo' : ''}><b>{dinero(m.saldo_total)}</b></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Totales</td>
                  <td>{dinero(suma('saldo_anterior'))}</td>
                  <td>{dinero(suma('jugadas'))}</td>
                  <td>{dinero(suma('abono'))}</td>
                  <td>{dinero(suma('premios'))}</td>
                  <td><b>{dinero(suma('saldo_total'))}</b></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
