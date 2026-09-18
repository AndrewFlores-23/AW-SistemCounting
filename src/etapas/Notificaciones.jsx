import { useEffect, useRef } from 'react'
import { dinero, fechaCorta } from '../lib/formato.js'
import { horaBonita } from '../lib/fechasNota.js'
import { DIAS_CUENTA_ALTA } from '../lib/analisis.js'

// Panel lateral con recordatorios de notas y avisos de cuentas altas
export default function Notificaciones({ avisos, hoy, onMarcar, onCerrar }) {
  const panel = useRef()
  useEffect(() => {
    panel.current?.focus()
    const alEscape = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alEscape)
    return () => window.removeEventListener('keydown', alEscape)
  }, [onCerrar])

  const recordatorios = avisos?.recordatorios ?? []
  const paraHoy = recordatorios.filter((r) => r.fecha <= hoy)
  const proximos = recordatorios.filter((r) => r.fecha > hoy)
  const altas = avisos?.altas ?? []
  const vacio = !recordatorios.length && !altas.length

  return (
    <div className="velo velo-panel" onClick={onCerrar}>
      <aside className="panel-avisos" role="dialog" aria-modal="true" aria-label="Notificaciones"
        tabIndex={-1} ref={panel} onClick={(e) => e.stopPropagation()}>
        <div className="panel-cabeza">
          <h3>Notificaciones</h3>
          <button className="btn fantasma" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>

        {!avisos && <p className="vacio">Cargando…</p>}
        {avisos && vacio && <p className="vacio">No hay avisos por ahora.</p>}

        {paraHoy.length > 0 && (
          <section>
            <h4>Para hoy</h4>
            <ul className="lista-avisos">
              {paraHoy.map((r) => <Recordatorio key={r.id} r={r} hoy={hoy} onMarcar={onMarcar} />)}
            </ul>
          </section>
        )}

        {altas.length > 0 && (
          <section>
            <h4>Cuentas altas</h4>
            <ul className="lista-avisos">
              {altas.map((a) => (
                <li key={a.id} className="aviso-item alta">
                  <div>
                    <b>{a.nombre}</b>
                    <p>Debe {dinero(a.saldo)}: unos {a.dias} días de lo que juega (promedio {dinero(Math.round(a.promedio))} por día).</p>
                  </div>
                </li>
              ))}
            </ul>
            <small className="panel-pie">Se avisa cuando el saldo pasa de {DIAS_CUENTA_ALTA} días de jugadas promedio del cliente.</small>
          </section>
        )}

        {proximos.length > 0 && (
          <section>
            <h4>Próximos</h4>
            <ul className="lista-avisos">
              {proximos.map((r) => <Recordatorio key={r.id} r={r} hoy={hoy} onMarcar={onMarcar} />)}
            </ul>
          </section>
        )}
      </aside>
    </div>
  )
}

function Recordatorio({ r, hoy, onMarcar }) {
  const atrasado = r.fecha < hoy
  const cuando = r.fecha === hoy ? 'Hoy' : fechaCorta(r.fecha)
  return (
    <li className={`aviso-item ${atrasado ? 'atrasado' : ''}`}>
      <div>
        <b>{r.nombre}</b>
        <p>{r.texto}</p>
        <small className="aviso-cuando">
          {atrasado && 'Atrasado · '}{cuando}{r.hora && ` · ${horaBonita(r.hora)}`}
        </small>
      </div>
      <button className="btn secundario chico" onClick={() => onMarcar(r.id)}>Listo</button>
    </li>
  )
}
