import { useRef, useState } from 'react'
import * as datos from '../lib/datos.js'
import { balanceDe, dinero } from '../lib/formato.js'
import { CampoMonto, Confirmar, Fila } from '../componentes.jsx'

export default function Etapa1({ cierre, setCierre, onSiguiente, onVerRegistros }) {
  const [valores, setValores] = useState({
    ventas: cierre.ventas, comision: cierre.comision, premios: cierre.premios,
  })
  const [confirmando, setConfirmando] = useState(false)
  const temporizador = useRef()
  const balance = balanceDe(valores)

  function cambiar(campo, n) {
    const nuevos = { ...valores, [campo]: n }
    setValores(nuevos)
    // Autoguardado: cada cambio llega a la base aunque se cierre la pestaña
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => guardar(nuevos), 600)
  }

  async function guardar(v = valores) {
    clearTimeout(temporizador.current)
    setCierre(await datos.actualizarCierre(cierre.id, v))
  }

  async function confirmar() {
    await guardar()
    onSiguiente()
  }

  return (
    <section className="etapa aparecer">
      <div className="etapa-titulo">
        <h2>Ventas del día</h2>
        <button className="btn secundario" onClick={onVerRegistros}>Ver registros</button>
      </div>

      <div className="tarjeta">
        <CampoMonto etiqueta="Total de ventas" valor={valores.ventas} onCambio={(n) => cambiar('ventas', n)} autoFocus />
        <CampoMonto etiqueta="Comisión" valor={valores.comision} onCambio={(n) => cambiar('comision', n)} />
        <CampoMonto etiqueta="Premios pagados" valor={valores.premios} onCambio={(n) => cambiar('premios', n)} />
      </div>

      <div className={`total ${balance < 0 ? 'negativo' : ''}`}>
        <span>Balance</span>
        <strong>{dinero(balance)}</strong>
        <small>Ventas − comisión − premios</small>
      </div>

      <button className="btn primario ancho" onClick={() => setConfirmando(true)}>Continuar</button>

      {confirmando && (
        <Confirmar titulo="¿Los datos están bien?" onNo={() => setConfirmando(false)} onSi={confirmar}>
          <Fila etiqueta="Ventas" valor={dinero(valores.ventas)} />
          <Fila etiqueta="Comisión" valor={`− ${dinero(valores.comision)}`} />
          <Fila etiqueta="Premios" valor={`− ${dinero(valores.premios)}`} />
          <Fila etiqueta="Balance" valor={dinero(balance)} fuerte />
        </Confirmar>
      )}
    </section>
  )
}
