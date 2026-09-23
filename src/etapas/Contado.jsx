import { useState } from 'react'
import * as datos from '../lib/datos.js'
import { dinero, redondear, resumirContado } from '../lib/formato.js'
import { CampoMonto, Confirmar, Fila, TablaContado } from '../componentes.jsx'

// Extensión opcional de la etapa 2: jugadas pagadas de contado ese día
export default function Contado({ cierre, clientes, jugadas, setJugadas, onVolver }) {
  const [formulario, setFormulario] = useState(jugadas.length === 0)
  const [porEliminar, setPorEliminar] = useState(null)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState('')
  const resumen = resumirContado(jugadas)

  async function guardar(jugada) {
    setError('')
    try {
      const fila = await datos.agregarContado({ ...jugada, cierre_id: cierre.id, fecha: cierre.fecha })
      const nombre = clientes.find((c) => c.id === jugada.cliente_id)?.nombre
      setJugadas([...jugadas, { ...fila, nombre }])
      setFormulario(false)
    } catch (e) {
      setError(e.message)
    }
  }

  // Se marca en pantalla de una vez; si no se pudo guardar, se devuelve
  async function marcarDeposito(j, deposito) {
    const poner = (valor) => setJugadas((lista) => lista.map((x) => (x.id === j.id ? { ...x, deposito: valor } : x)))
    poner(deposito)
    setError('')
    try {
      await datos.marcarDepositoContado(j.id, deposito)
    } catch (e) {
      poner(!deposito)
      setError(e.message)
    }
  }

  async function eliminar() {
    await datos.eliminarContado(porEliminar.id)
    setJugadas(jugadas.filter((j) => j.id !== porEliminar.id))
    setPorEliminar(null)
  }

  return (
    <section className="etapa aparecer">
      <button className="btn fantasma volver" onClick={onVolver}>← Volver a clientes</button>
      <div>
        <h2>Jugadas de contado</h2>
        <p className="subtitulo-suave">Lista aparte y opcional. No cambia el saldo de los clientes.</p>
      </div>
      {error && <p className="aviso error">{error}</p>}

      {clientes.length === 0 ? (
        <p className="vacio">Primero agregá clientes en la lista de clientes.</p>
      ) : (
        <>
          {jugadas.length > 0 && (
            <ul className="lista-contado">
              {jugadas.map((j, i) => (
                <li key={j.id}>
                  <span className="contado-num">{i + 1}</span>
                  <div className="contado-info">
                    <b>{j.nombre}</b>
                    <small>
                      Jugó {dinero(j.monto)}
                      {j.tiene_premio && <> · Premio − {dinero(j.premio)}</>}
                    </small>
                  </div>
                  <b className={`contado-neto ${j.neto < 0 ? 'negativo' : ''}`}>{dinero(j.neto)}</b>
                  <button className="btn fantasma quitar" aria-label={`Quitar jugada de ${j.nombre}`}
                    onClick={() => setPorEliminar(j)}>✕</button>
                  <label className={`casilla-deposito compacta ${j.deposito ? 'marcada' : ''}`}>
                    <input type="checkbox" checked={Boolean(j.deposito)} onChange={(e) => marcarDeposito(j, e.target.checked)} />
                    <span>
                      <b>Depósito</b>
                      <small>{j.deposito ? 'El pago ya está en la cuenta' : 'Marcar cuando el pago esté en la cuenta'}</small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {formulario ? (
            <NuevaJugada
              key={jugadas.length}
              clientes={clientes}
              puedeCancelar={jugadas.length > 0}
              onGuardar={guardar}
              onCancelar={() => setFormulario(false)}
            />
          ) : (
            <button className="btn secundario ancho" onClick={() => setFormulario(true)}>+ Agregar otra jugada</button>
          )}

          {jugadas.length > 0 && (
            <>
              <div className="tarjeta">
                <h4>Total por cliente</h4>
                <TablaContado jugadas={jugadas} />
              </div>
              <div className={`total ${resumen.neto < 0 ? 'negativo' : ''}`}>
                <span>Total de contado</span>
                <strong>{dinero(resumen.neto)}</strong>
                <small>{resumen.cantidad} jugada{resumen.cantidad > 1 ? 's' : ''} · jugado {dinero(resumen.monto)} − premios {dinero(resumen.premio)}</small>
              </div>
            </>
          )}

          <div className="acciones pie">
            <button className="btn secundario" onClick={onVolver}>Volver</button>
            <button className="btn primario" disabled={!jugadas.length || formulario} onClick={() => setConfirmando(true)}>
              Confirmar contado
            </button>
          </div>
        </>
      )}

      {porEliminar && (
        <Confirmar titulo="¿Quitar esta jugada?" textoSi="Quitar" textoNo="Cancelar" peligro
          onSi={eliminar} onNo={() => setPorEliminar(null)}>
          <p>{porEliminar.nombre} · {dinero(porEliminar.monto)}</p>
        </Confirmar>
      )}

      {confirmando && (
        <Confirmar titulo="¿Las jugadas de contado están bien?" onNo={() => setConfirmando(false)} onSi={onVolver}>
          {resumen.clientes.map((c) => <Fila key={c.cliente_id} etiqueta={c.nombre} valor={dinero(c.neto)} />)}
          <Fila etiqueta="Total de contado" valor={dinero(resumen.neto)} fuerte />
        </Confirmar>
      )}
    </section>
  )
}

function NuevaJugada({ clientes, puedeCancelar, onGuardar, onCancelar }) {
  const [clienteId, setClienteId] = useState('')
  const [monto, setMonto] = useState(0)
  const [tienePremio, setTienePremio] = useState(false)
  const [premio, setPremio] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const neto = redondear(monto - (tienePremio ? premio : 0))
  const valida = clienteId && monto > 0 && (!tienePremio || premio > 0)

  async function enviar(e) {
    e.preventDefault()
    if (!valida) return
    setGuardando(true)
    await onGuardar({ cliente_id: clienteId, monto, tiene_premio: tienePremio, premio: tienePremio ? premio : 0 })
    setGuardando(false)
  }

  return (
    <form className="tarjeta nuevo" onSubmit={enviar}>
      <label className="campo">
        <span>Cliente</span>
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
          <option value="" disabled>Elegí un cliente…</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </label>

      <CampoMonto etiqueta="Monto jugado de contado" valor={0} onCambio={setMonto} />

      <label className="interruptor">
        <input type="checkbox" checked={tienePremio} onChange={(e) => setTienePremio(e.target.checked)} />
        <span className="interruptor-pista" aria-hidden="true" />
        ¿Pegó premio?
      </label>

      {tienePremio && <CampoMonto etiqueta="Monto del premio" valor={0} onCambio={setPremio} autoFocus />}

      <div className={`total chico ${neto < 0 ? 'negativo' : ''}`}>
        <span>Total de esta jugada</span>
        <strong>{dinero(neto)}</strong>
      </div>

      <div className="acciones">
        {puedeCancelar && <button type="button" className="btn secundario" onClick={onCancelar}>Cancelar</button>}
        <button className="btn primario" disabled={!valida || guardando}>
          {guardando ? 'Guardando…' : 'Guardar jugada'}
        </button>
      </div>
    </form>
  )
}
