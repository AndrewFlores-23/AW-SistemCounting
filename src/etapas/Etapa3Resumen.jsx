import { useEffect, useState } from 'react'
import * as datos from '../lib/datos.js'
import { calcularCuadre, dinero, fechaLarga, hoyCR, saldoDe } from '../lib/formato.js'
import { Cargando, Confirmar, Cuadre, Fila, NotasDelDia, TablaContado } from '../componentes.jsx'

export default function Etapa3({ cierre, setCierre, onAtras }) {
  const [clientes, setClientes] = useState(null)
  const [revisado, setRevisado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState('')
  const [finalizando, setFinalizando] = useState(false)
  const [contado, setContado] = useState(null)

  useEffect(() => {
    datos.listarClientes(cierre.fecha).then(setClientes).catch((e) => setError(e.message))
    datos.listarContado(cierre.id).then(setContado).catch((e) => setError(e.message))
  }, [cierre.fecha, cierre.id])

  // Clientes sin movimiento hoy mantienen su saldo anterior
  const filas = (clientes ?? []).map((c) => {
    const m = { saldo_anterior: c.saldo_anterior, jugadas: c.jugadas ?? 0, abono: c.abono ?? 0, premios: c.premios ?? 0 }
    return { ...c, ...m, saldo_total: saldoDe(m) }
  })
  const cuadre = clientes && contado ? calcularCuadre(cierre, filas, contado) : null
  // Pagos por verificar: abonos de hoy y jugadas de contado, cada uno con su casilla Depósito
  const pagos = [
    ...filas.filter((f) => Number(f.abono) > 0)
      .map((f) => ({ id: `abono-${f.id}`, nombre: f.nombre, monto: Number(f.abono), deposito: f.deposito })),
    ...(contado ?? []).map((j) => ({
      id: `contado-${j.id}`, nombre: j.nombre, monto: Number(j.monto) - Number(j.premio), deposito: j.deposito, contado: true,
    })),
  ].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' }))
  const depositados = pagos.filter((p) => p.deposito)
  const faltanDeposito = pagos.filter((p) => !p.deposito)
  const sumaPagos = (lista) => lista.reduce((t, p) => t + p.monto, 0)
  const suma = (campo) => filas.reduce((t, f) => t + Number(f[campo] || 0), 0)

  async function finalizar() {
    setConfirmando(false)
    setFinalizando(true)
    try {
      const minimo = new Promise((r) => setTimeout(r, 1200))
      const [listo] = await Promise.all([datos.finalizarCierre(cierre, clientes), minimo])
      setCierre(listo)
      window.scrollTo(0, 0)
    } catch (e) {
      setFinalizando(false)
      setError(e.message)
    }
  }

  return (
    <section className="etapa aparecer">
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

      {cuadre && <Cuadre cuadre={cuadre} />}

      <div className="tarjeta">
        <h4>Clientes <small>({filas.length})</small></h4>
        {clientes === null && !error && <Cargando texto="Armando el resumen…" />}
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
                    <td>{dinero(f.abono)}{f.deposito && <span className="marca-deposito" title="Depósito confirmado"> ✓</span>}</td>
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

      {pagos.length > 0 && (
        <div className="tarjeta">
          <h4>Depósitos <small>({depositados.length} de {pagos.length} confirmados)</small></h4>
          <div className="depositos">
            <div className="grupo-deposito faltan">
              <b>Faltan · {dinero(sumaPagos(faltanDeposito))}</b>
              {faltanDeposito.length === 0 && <p className="vacio">Todos los pagos están depositados.</p>}
              {faltanDeposito.map((p) => <PagoDeposito key={p.id} pago={p} />)}
            </div>
            <div className="grupo-deposito confirmados">
              <b>✓ Confirmados · {dinero(sumaPagos(depositados))}</b>
              {depositados.length === 0 && <p className="vacio">Ningún depósito confirmado todavía.</p>}
              {depositados.map((p) => <PagoDeposito key={p.id} pago={p} />)}
            </div>
          </div>
        </div>
      )}

      <div className="tarjeta">
        <h4>Contado {contado?.length > 0 && <small>({contado.length} jugadas)</small>}</h4>
        {contado === null ? <Cargando texto="Cargando contado…" /> : <TablaContado jugadas={contado} />}
      </div>

      <NotasDelDia filas={filas} />

      <label className="check">
        <input type="checkbox" checked={revisado} onChange={(e) => setRevisado(e.target.checked)} />
        Revisé la información y está correcta
      </label>

      <div className="acciones pie">
        <button className="btn secundario" onClick={onAtras}>Atrás</button>
        <button className="btn primario" disabled={!revisado || clientes === null || contado === null} onClick={() => setConfirmando(true)}>
          Finalizar cierre
        </button>
      </div>

      {confirmando && (
        <Confirmar titulo={cierre.fecha < hoyCR() ? `¿Finalizar el cierre del ${fechaLarga(cierre.fecha)}?` : '¿Finalizar el cierre de hoy?'}
          textoSi="Finalizar" textoNo="Cancelar"
          onSi={finalizar} onNo={() => setConfirmando(false)}>
          {cuadre && !cuadre.cuadra && (
            <p className="aviso error">Ojo: los montos no cuadran con lo anotado al inicio.</p>
          )}
          <p>Después de finalizar ya no se puede cambiar nada de este día; solo se podrá consultar en Registros.</p>
        </Confirmar>
      )}
      {finalizando && <Cargando velo texto="Guardando el cierre…" />}
    </section>
  )
}

function PagoDeposito({ pago }) {
  return (
    <Fila
      etiqueta={<>{pago.nombre} <em className="etiqueta">{pago.contado ? 'Contado' : 'Abono'}</em></>}
      valor={dinero(pago.monto)}
    />
  )
}
