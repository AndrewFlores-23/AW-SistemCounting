import { useEffect, useRef, useState } from 'react'
import * as datos from '../lib/datos.js'
import { dinero, saldoDe } from '../lib/formato.js'
import { CampoMonto, Confirmar } from '../componentes.jsx'

export default function Etapa2({ cierre, onAtras, onSiguiente }) {
  const [clientes, setClientes] = useState(null)
  const [abierto, setAbierto] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [porEliminar, setPorEliminar] = useState(null)
  const [error, setError] = useState('')
  const guardadosPendientes = useRef(new Set())

  async function continuar() {
    await Promise.all([...guardadosPendientes.current].map((vaciar) => vaciar()))
    onSiguiente()
  }

  async function cargar() {
    try {
      setClientes(await datos.listarClientes(cierre.fecha))
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { cargar() }, [cierre.fecha])

  async function crear(nombre, saldo) {
    const nuevo = await datos.agregarCliente(nombre, saldo)
    setAgregando(false)
    await cargar()
    setAbierto(nuevo.id)
  }

  async function eliminar() {
    await datos.eliminarCliente(porEliminar.id)
    setPorEliminar(null)
    cargar()
  }

  const actualizarLocal = (id, cambios) =>
    setClientes((lista) => lista.map((c) => (c.id === id ? { ...c, ...cambios } : c)))

  return (
    <section className="etapa">
      <div className="etapa-titulo">
        <h2>Clientes</h2>
        <button className="btn primario" onClick={() => setAgregando(true)}>+ Agregar</button>
      </div>

      {error && <p className="aviso error">{error}</p>}
      {agregando && <NuevoCliente onGuardar={crear} onCancelar={() => setAgregando(false)} />}
      {clientes === null && <p className="cargando">Cargando clientes…</p>}
      {clientes?.length === 0 && !agregando && (
        <p className="vacio">Todavía no hay clientes. Agregá el primero.</p>
      )}

      <ul className="lista-clientes">
        {clientes?.map((c) => (
          <Cliente
            key={c.id}
            cliente={c}
            cierre={cierre}
            abierto={abierto === c.id}
            onAlternar={() => setAbierto(abierto === c.id ? null : c.id)}
            onEliminar={() => setPorEliminar(c)}
            onGuardado={(cambios) => actualizarLocal(c.id, cambios)}
            pendientes={guardadosPendientes.current}
          />
        ))}
      </ul>

      <div className="acciones pie">
        <button className="btn secundario" onClick={onAtras}>Atrás</button>
        <button className="btn primario" onClick={continuar}>Ver resumen</button>
      </div>

      {porEliminar && (
        <Confirmar titulo={`¿Eliminar a ${porEliminar.nombre}?`} textoSi="Eliminar" textoNo="Cancelar" peligro
          onSi={eliminar} onNo={() => setPorEliminar(null)}>
          <p>Deja de aparecer en la lista. Su historial queda guardado en la bitácora.</p>
        </Confirmar>
      )}
    </section>
  )
}

function NuevoCliente({ onGuardar, onCancelar }) {
  const [nombre, setNombre] = useState('')
  const [saldo, setSaldo] = useState(0)
  const [guardando, setGuardando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setGuardando(true)
    await onGuardar(nombre, saldo)
  }

  return (
    <form className="tarjeta nuevo" onSubmit={enviar}>
      <label className="campo">
        <span>Nombre del cliente</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus required />
      </label>
      <CampoMonto etiqueta="Saldo anterior" valor={0} onCambio={setSaldo} />
      <div className="acciones">
        <button type="button" className="btn secundario" onClick={onCancelar}>Cancelar</button>
        <button className="btn primario" disabled={guardando}>Agregar</button>
      </div>
    </form>
  )
}

function Cliente({ cliente, cierre, abierto, onAlternar, onEliminar, onGuardado, pendientes }) {
  const [mov, setMov] = useState({
    saldo_anterior: cliente.saldo_anterior,
    jugadas: cliente.jugadas ?? 0,
    abono: cliente.abono ?? 0,
    premios: cliente.premios ?? 0,
  })
  const [estado, setEstado] = useState('') // '', 'guardando', 'guardado', 'error'
  const temporizador = useRef()
  const pendiente = useRef(null)
  const enVuelo = useRef(Promise.resolve())
  const total = saldoDe(mov)
  const conMovimiento = Boolean(cliente.mov_id)

  // Guarda ya lo que falte (al continuar o al salir de la pantalla)
  const vaciar = useRef(null)
  vaciar.current = () => {
    if (!pendiente.current) return enVuelo.current
    clearTimeout(temporizador.current)
    return guardar(...pendiente.current)
  }
  useEffect(() => {
    const fn = () => vaciar.current()
    pendientes.add(fn)
    return () => { pendientes.delete(fn); fn() }
  }, [pendientes])

  function cambiar(campo, n) {
    const nuevo = { ...mov, [campo]: n }
    setMov(nuevo)
    pendiente.current = [nuevo, campo === 'saldo_anterior' || pendiente.current?.[1] === 'saldo_anterior' ? 'saldo_anterior' : campo]
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => guardar(...pendiente.current), 600)
  }

  function guardar(m, campo) {
    pendiente.current = null
    // Los guardados van en fila para que uno viejo no pise a uno nuevo
    enVuelo.current = enVuelo.current.then(() => enviar(m, campo))
    return enVuelo.current
  }

  async function enviar(m, campo) {
    setEstado('guardando')
    try {
      if (campo === 'saldo_anterior' && !cliente.tiene_historial) {
        await datos.actualizarSaldoInicial(cliente.id, m.saldo_anterior)
      }
      const fila = await datos.guardarMovimiento({
        cierre_id: cierre.id, cliente_id: cliente.id, fecha: cierre.fecha, ...m,
      })
      onGuardado({ ...m, mov_id: fila.id, saldo_total: fila.saldo_total })
      setEstado('guardado')
    } catch {
      setEstado('error')
    }
  }

  return (
    <li className={`cliente ${abierto ? 'abierto' : ''}`}>
      <button className="cliente-cabeza" onClick={onAlternar} aria-expanded={abierto}>
        <span className="cliente-nombre">
          {cliente.nombre}
          {!cliente.tiene_historial && <em className="etiqueta">Nuevo</em>}
          {conMovimiento && <em className="etiqueta ok">Registrado</em>}
        </span>
        <span className={`cliente-saldo ${total < 0 ? 'negativo' : ''}`}>{dinero(total)}</span>
      </button>

      {abierto && (
        <div className="cliente-cuerpo">
          {cliente.tiene_historial ? (
            <div className="saldo-fijo">
              <span>Saldo anterior</span>
              <b>{dinero(mov.saldo_anterior)}</b>
            </div>
          ) : (
            <CampoMonto etiqueta="Saldo anterior" valor={mov.saldo_anterior}
              onCambio={(n) => cambiar('saldo_anterior', n)} />
          )}
          <CampoMonto etiqueta="Jugadas de hoy" valor={mov.jugadas} onCambio={(n) => cambiar('jugadas', n)} autoFocus />
          <div className="dos-columnas">
            <CampoMonto etiqueta="Abono" valor={mov.abono} onCambio={(n) => cambiar('abono', n)} />
            <CampoMonto etiqueta="Premios" valor={mov.premios} onCambio={(n) => cambiar('premios', n)} />
          </div>

          <div className={`total chico ${total < 0 ? 'negativo' : ''}`}>
            <span>Saldo total</span>
            <strong>{dinero(total)}</strong>
          </div>

          <div className="cliente-pie">
            <small className={`estado ${estado}`}>
              {estado === 'guardando' && 'Guardando…'}
              {estado === 'guardado' && 'Guardado'}
              {estado === 'error' && 'No se pudo guardar'}
            </small>
            <button className="btn fantasma peligro-texto" onClick={onEliminar}>Eliminar cliente</button>
          </div>
        </div>
      )}
    </li>
  )
}
