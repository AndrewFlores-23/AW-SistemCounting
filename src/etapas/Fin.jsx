import { dinero, fechaLarga } from '../lib/formato.js'
import { Logo } from '../componentes.jsx'

export default function Fin({ cierre, hoy, onSalir, onVerRegistros, onContinuar }) {
  const eraPendiente = cierre.fecha < hoy
  return (
    <section className="fin aparecer">
      <Logo tamano={170} />
      <div className="fin-check" aria-hidden="true">✓</div>
      <h2>{eraPendiente ? 'Fin del cierre' : 'Fin del cierre de hoy'}</h2>
      <p>{fechaLarga(cierre.fecha)}</p>
      <p className="fin-balance">Balance: <b>{dinero(cierre.balance)}</b></p>
      {eraPendiente
        ? <button className="btn primario" onClick={onContinuar}>Empezar el cierre de hoy</button>
        : <p className="fin-aviso">El próximo cierre se habilita mañana.</p>}
      <div className="acciones">
        <button className="btn secundario" onClick={onVerRegistros}>Ver registros</button>
        <button className="btn secundario" onClick={onSalir}>Cerrar sesión</button>
      </div>
    </section>
  )
}
