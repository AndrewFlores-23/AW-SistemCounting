import { useEffect, useState } from 'react'
import * as datos from '../lib/datos.js'
import { dinero, fechaLarga, saldoDe } from '../lib/formato.js'
import { Confirmar, Fila } from '../componentes.jsx'

export default function Etapa3({ cierre, setCierre, onAtras }) {
  const [clientes, setClientes] = useState(null)
  const [revisado, setRevisado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    datos.listarClientes(cierre.fecha).then(setClientes).catch((e) => setError(e.message))
  }, [cierre.fecha])

  // Clientes sin movimiento hoy mantienen su saldo anterior
  const filas = (clientes ?? []).map((c) => {
    const m = { saldo_anterior: c.saldo_anterior, jugadas: c.jugadas ?? 0, abono: c.abono ?? 0, premios: c.premios ?? 0 }
    return { ...c, ...m, saldo_total: saldoDe(m) }
  })
  const suma = (campo) => filas.reduce((t, f) => t + Number(f[campo] || 0), 0)

  async function finalizar() {
    try {
      setCierre(await datos.finalizarCierre(cierre, clientes))
      window.scrollTo(0, 0)
    } catch (e) {
      setConfirmando(false)
      setError(e.message)
    }
  }

  return (
    <section className="etapa">
      <h2>Resumen del día</h2>
      <p className="subtitulo">{fechaLarga(cierre.fecha)}</p>
      {error && <p className="aviso error">{error}</p>}

      <div className="tarjeta">
        <h4>Ventas</h4>
        <Fila etiqueta="Ventas" valor={dinero(cierre.ventas)} />
        <Fila etiqueta="Comisión" valor={`− ${dinero(cierre.comision)}`} />
        <Fila etiqueta="Premios" valor={`− ${dinero(cierre.premios)}`} />
        <Fila etiqueta="Balance" valor={dinero(cierre.balance)} fuerte />
      </div>

      <div className="tarjeta">
        <h4>Clientes <small>({filas.length})</small></h4>
        {clientes === null && <p className="cargando">Cargando…</p>}
        {filas.length > 0 && (
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr><th>Cliente</th><th>Anterior</th><th>Jugadas</th><th>Abono</th><th>Premios</th><th>Saldo</th></tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td>{f.nombre}</td>
                    <td>{dinero(f.saldo_anterior)}</td>
                    <td>{dinero(f.jugadas)}</td>
                    <td>{dinero(f.abono)}</td>
                    <td>{dinero(f.premios)}</td>
                    <td className={f.saldo_total < 0 ? 'negativo' : ''}><b>{dinero(f.saldo_total)}</b></td>
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
        {filas.length === 0 && clientes !== null && <p className="vacio">Sin clientes registrados.</p>}
      </div>

      <label className="check">
        <input type="checkbox" checked={revisado} onChange={(e) => setRevisado(e.target.checked)} />
        Revisé la información y está correcta
      </label>

      <div className="acciones pie">
        <button className="btn secundario" onClick={onAtras}>Atrás</button>
        <button className="btn primario" disabled={!revisado || clientes === null} onClick={() => setConfirmando(true)}>
          Finalizar cierre
        </button>
      </div>

      {confirmando && (
        <Confirmar titulo="¿Finalizar el cierre de hoy?" textoSi="Finalizar" textoNo="Cancelar"
          onSi={finalizar} onNo={() => setConfirmando(false)}>
          <p>Después de finalizar ya no se pueden cambiar los datos de hoy.</p>
        </Confirmar>
      )}
    </section>
  )
}
