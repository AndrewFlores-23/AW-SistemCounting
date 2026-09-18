import { useEffect, useState } from 'react'
import * as datos from '../lib/datos.js'
import { dinero, fechaCorta, fechaLarga, redondear, sumarDias } from '../lib/formato.js'
import { CampoMonto, Cargando, Confirmar, Fila } from '../componentes.jsx'

// Aparece cuando hay días sin cierre entre el último registrado y hoy
export default function Retomar({ faltantes, hoy, onListo, onVerRegistros }) {
  const [modo, setModo] = useState('elegir') // 'elegir' | 'ajuste'
  const [sinTrabajo, setSinTrabajo] = useState(() => new Set())
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const atrasados = faltantes.filter((f) => !sinTrabajo.has(f))
  const ultimo = sumarDias(faltantes[0], -1)

  function alternar(fecha) {
    const nuevo = new Set(sinTrabajo)
    if (nuevo.has(fecha)) nuevo.delete(fecha)
    else nuevo.add(fecha)
    setSinTrabajo(nuevo)
  }

  async function registrar() {
    setConfirmando(false)
    setGuardando(true)
    try {
      await datos.registrarDiasFaltantes({ atrasados, sinTrabajo: [...sinTrabajo] })
      onListo()
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  if (modo === 'ajuste') {
    return (
      <AjusteSaldos faltantes={faltantes} hoy={hoy} onVolver={() => setModo('elegir')} onListo={onListo} />
    )
  }

  return (
    <section className="etapa aparecer">
      <div className="etapa-titulo">
        <h2>Días sin cierre</h2>
        <button className="btn secundario" onClick={onVerRegistros}>Ver registros</button>
      </div>
      <p className="subtitulo-suave">
        El último cierre en la app fue el <b>{fechaLarga(ultimo)}</b>. Para que los saldos sigan bien, elegí cómo retomar.
      </p>
      {error && <p className="aviso error">{error}</p>}

      <div className="tarjeta opcion">
        <h4>Opción 1 · Registrar los días que faltan</h4>
        <p>Hacés el cierre de cada día con lo anotado en el cuaderno, del más viejo al más nuevo. Marcá los días que no trabajaste.</p>
        <ul className="lista-dias">
          {faltantes.map((f) => (
            <li key={f} className={sinTrabajo.has(f) ? 'descanso' : ''}>
              <span>{fechaLarga(f)}</span>
              <label className="interruptor chico">
                <input type="checkbox" checked={sinTrabajo.has(f)} onChange={() => alternar(f)} />
                <span className="interruptor-pista" aria-hidden="true" />
                No trabajé
              </label>
            </li>
          ))}
        </ul>
        <button className="btn primario ancho" disabled={guardando} onClick={() => setConfirmando(true)}>
          {atrasados.length
            ? `Registrar ${atrasados.length} día${atrasados.length > 1 ? 's' : ''}`
            : 'Continuar con el cierre de hoy'}
        </button>
      </div>

      <div className="tarjeta opcion">
        <h4>Opción 2 · Solo actualizar saldos</h4>
        <p>Ponés el saldo actual de cada cliente según el cuaderno y seguís con el cierre de hoy. Esos días no quedan con detalle en Registros.</p>
        <button className="btn secundario ancho" disabled={guardando} onClick={() => setModo('ajuste')}>
          Actualizar saldos
        </button>
      </div>

      {confirmando && (
        <Confirmar titulo="¿Registrar los días que faltan?" textoSi="Sí, empezar" textoNo="Revisar"
          onSi={registrar} onNo={() => setConfirmando(false)}>
          {atrasados.length > 0 && (
            <p>Vas a hacer el cierre de: <b>{atrasados.map(fechaCorta).join(', ')}</b>. Uno por uno, empezando por el más viejo.</p>
          )}
          {sinTrabajo.size > 0 && (
            <p className="nota-alerta">Sin trabajo: {[...sinTrabajo].sort().map(fechaCorta).join(', ')}.</p>
          )}
        </Confirmar>
      )}
      {guardando && <Cargando velo texto="Preparando los días…" />}
    </section>
  )
}

function AjusteSaldos({ faltantes, hoy, onVolver, onListo }) {
  const [clientes, setClientes] = useState(null)
  const [saldos, setSaldos] = useState({})
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    datos.listarClientes(hoy).then((lista) => {
      setClientes(lista)
      setSaldos(Object.fromEntries(lista.map((c) => [c.id, Number(c.saldo_anterior)])))
    }).catch((e) => setError(e.message))
  }, [hoy])

  const cambiados = (clientes ?? []).filter((c) => redondear(saldos[c.id]) !== redondear(Number(c.saldo_anterior)))
  const rango = faltantes.length > 1
    ? `del ${fechaCorta(faltantes[0])} al ${fechaCorta(faltantes.at(-1))}`
    : `del ${fechaCorta(faltantes[0])}`

  async function guardar() {
    setConfirmando(false)
    setGuardando(true)
    try {
      await datos.registrarAjuste(
        sumarDias(hoy, -1),
        cambiados.map((c) => ({ cliente_id: c.id, saldo: redondear(saldos[c.id]) })),
        `Ajuste según cuaderno (${rango})`,
      )
      onListo()
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  return (
    <section className="etapa aparecer">
      <button className="btn fantasma volver" onClick={onVolver}>← Volver</button>
      <div>
        <h2>Actualizar saldos</h2>
        <p className="subtitulo-suave">Poné el saldo de cada cliente según el cuaderno. Si no cambió, dejalo igual.</p>
      </div>
      {error && <p className="aviso error">{error}</p>}
      {clientes === null && !error && <Cargando texto="Cargando clientes…" />}
      {clientes?.length === 0 && (
        <p className="vacio">No hay clientes todavía. Podés agregarlos en el cierre de hoy.</p>
      )}

      {clientes?.length > 0 && (
        <ul className="lista-ajuste">
          {clientes.map((c) => {
            const dif = redondear(saldos[c.id] - Number(c.saldo_anterior))
            return (
              <li key={c.id} className="tarjeta">
                <div className="ajuste-cabeza">
                  <b>{c.nombre}</b>
                  <small>En la app: {dinero(c.saldo_anterior)}</small>
                </div>
                <CampoMonto etiqueta="Saldo según cuaderno" valor={c.saldo_anterior}
                  onCambio={(n) => setSaldos({ ...saldos, [c.id]: n })} />
                {dif !== 0 && (
                  <small className={`ajuste-dif ${dif > 0 ? 'sube' : 'baja'}`}>
                    {dif > 0 ? 'Sube' : 'Baja'} {dinero(Math.abs(dif))}
                  </small>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="acciones pie">
        <button className="btn secundario" onClick={onVolver}>Volver</button>
        <button className="btn primario" disabled={clientes === null || guardando} onClick={() => setConfirmando(true)}>
          Guardar y seguir
        </button>
      </div>

      {confirmando && (
        <Confirmar titulo="¿Los saldos están bien?" textoSi="Sí, guardar" textoNo="Revisar"
          onSi={guardar} onNo={() => setConfirmando(false)}>
          {cambiados.length === 0
            ? <p>No cambiaste ningún saldo. Se sigue con los saldos que tiene la app.</p>
            : cambiados.map((c) => (
              <Fila key={c.id} etiqueta={c.nombre}
                valor={`${dinero(c.saldo_anterior)} → ${dinero(saldos[c.id])}`} />
            ))}
          <p className="nota-alerta">Queda en Registros como “Ajuste de saldos”.</p>
        </Confirmar>
      )}
      {guardando && <Cargando velo texto="Guardando saldos…" />}
    </section>
  )
}
