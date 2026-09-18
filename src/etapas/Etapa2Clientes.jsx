import { useEffect, useRef, useState } from 'react'
import * as datos from '../lib/datos.js'
import { calcularCuadre, dinero, fechaCorta, limpiarNota, resumirContado, saldoDe } from '../lib/formato.js'
import { CampoMonto, Cargando, Confirmar, Cuadre } from '../componentes.jsx'
import Contado from './Contado.jsx'

export default function Etapa2({ cierre, onAtras, onSiguiente }) {
  const [clientes, setClientes] = useState(null)
  const [abierto, setAbierto] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [porEliminar, setPorEliminar] = useState(null)
  const [error, setError] = useState('')
  const guardadosPendientes = useRef(new Set())
  const [modo, setModo] = useState('clientes') // 'clientes' | 'contado'
  const [contado, setContado] = useState([])

  useEffect(() => {
    datos.listarContado(cierre.id).then(setContado).catch((e) => setError(e.message))
  }, [cierre.id])

  const [alertaCuadre, setAlertaCuadre] = useState(false)

  async function continuar() {
    await Promise.all([...guardadosPendientes.current].map((vaciar) => vaciar()))
    // Si lo registrado no coincide con la etapa 1, se avisa antes de seguir
    if (!calcularCuadre(cierre, clientes ?? [], contado).cuadra) setAlertaCuadre(true)
    else onSiguiente()
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

  function cambiarModo(m) {
    setModo(m)
    window.scrollTo(0, 0)
  }

  if (modo === 'contado') {
    return (
      <Contado cierre={cierre} clientes={clientes ?? []} jugadas={contado} setJugadas={setContado}
        onVolver={() => cambiarModo('clientes')} />
    )
  }
  const resumenContado = resumirContado(contado)
  const cuadre = calcularCuadre(cierre, clientes ?? [], contado)

  return (
    <section className="etapa aparecer">
      <div className="etapa-titulo">
        <h2>Clientes</h2>
        <button className="btn primario" onClick={() => setAgregando(true)}>+ Agregar</button>
      </div>

      {clientes !== null && <Cuadre cuadre={cuadre} />}

      {error && <p className="aviso error">{error}</p>}
      {agregando && <NuevoCliente onGuardar={crear} onCancelar={() => setAgregando(false)} />}
      {clientes === null && !error && <Cargando texto="Cargando clientes…" />}
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
            onCambio={(cambios) => actualizarLocal(c.id, cambios)}
            pendientes={guardadosPendientes.current}
          />
        ))}
      </ul>

      {clientes?.length > 0 && (
        <button className="tarjeta-contado" onClick={() => cambiarModo('contado')}>
          <span>
            <b>Jugadas de contado</b>
            <small>
              {resumenContado.cantidad
                ? `${resumenContado.cantidad} jugada${resumenContado.cantidad > 1 ? 's' : ''} · jugado ${dinero(resumenContado.monto)}`
                : 'Opcional · si algún cliente jugó de contado hoy'}
            </small>
          </span>
          <strong>{resumenContado.cantidad ? dinero(resumenContado.neto) : 'Abrir →'}</strong>
        </button>
      )}

      <div className="acciones pie">
        <button className="btn secundario" onClick={onAtras}>Atrás</button>
        <button className="btn primario" onClick={continuar}>Ver resumen</button>
      </div>

      {alertaCuadre && (
        <Confirmar titulo="Los montos no cuadran" textoSi="Continuar igual" textoNo="Revisar"
          onNo={() => setAlertaCuadre(false)}
          onSi={() => { setAlertaCuadre(false); onSiguiente() }}>
          <Cuadre cuadre={cuadre} />
        </Confirmar>
      )}

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

function Cliente({ cliente, cierre, abierto, onAlternar, onEliminar, onGuardado, onCambio, pendientes }) {
  const [mov, setMov] = useState({
    saldo_anterior: cliente.saldo_anterior,
    jugadas: cliente.jugadas ?? 0,
    abono: cliente.abono ?? 0,
    premios: cliente.premios ?? 0,
    nota: cliente.nota ?? '',
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
    onCambio({ jugadas: nuevo.jugadas, premios: nuevo.premios, abono: nuevo.abono, saldo_anterior: nuevo.saldo_anterior })
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
        cierre_id: cierre.id, cliente_id: cliente.id, fecha: cierre.fecha, ...m, nota: limpiarNota(m.nota),
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
          {cliente.nota_anterior && <em className="etiqueta nota" title={cliente.nota_anterior}>📝 Nota</em>}
        </span>
        <span className={`cliente-saldo ${total < 0 ? 'negativo' : ''}`}>{dinero(total)}</span>
      </button>

      {abierto && (
        <div className="cliente-cuerpo">
          {cliente.nota_anterior && (
            <div className="recordatorio">
              <small>Nota del {fechaCorta(cliente.fecha_nota_anterior)}</small>
              <p>{cliente.nota_anterior}</p>
            </div>
          )}
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

          <label className="campo">
            <span>Nota para mañana <small>(opcional)</small></span>
            <textarea
              rows={2}
              maxLength={280}
              placeholder="Ej.: quedó de abonar el viernes"
              value={mov.nota}
              onChange={(e) => cambiar('nota', e.target.value)}
            />
          </label>

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
