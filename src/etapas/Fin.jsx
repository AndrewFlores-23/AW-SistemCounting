import { dinero, fechaLarga } from '../lib/formato.js'
import { Logo } from '../componentes.jsx'

export default function Fin({ cierre, onSalir, onVerRegistros }) {
  return (
    <section className="fin aparecer">
      <Logo tamano={88} />
      <div className="fin-check" aria-hidden="true">✓</div>
      <h2>Fin del cierre de hoy</h2>
      <p>{fechaLarga(cierre.fecha)}</p>
      <p className="fin-balance">Balance: <b>{dinero(cierre.balance)}</b></p>
      <div className="acciones">
        <button className="btn secundario" onClick={onVerRegistros}>Ver registros</button>
        <button className="btn secundario" onClick={onSalir}>Cerrar sesión</button>
      </div>
    </section>
  )
}
