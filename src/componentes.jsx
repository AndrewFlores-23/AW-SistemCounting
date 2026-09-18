import { useState } from 'react'
import { aNumero, dinero, resumirContado } from './lib/formato.js'

// Logo de texto; `tamano` es el ancho aproximado en píxeles
export function Logo({ tamano = 96 }) {
  return <div className="logo-texto" style={{ fontSize: tamano * 0.2 }}>AWRiseCR</div>
}

// Pantalla de carga: el logo respira con un anillo que gira alrededor
export function Cargando({ texto = 'Cargando…', pantalla, velo }) {
  const tamano = pantalla || velo ? 130 : 84
  const contenido = (
    <div className={`cargador ${pantalla ? 'pantalla' : ''}`} role="status" aria-live="polite">
      <div className="cargador-logo" style={{ '--t': `${Math.round(tamano * 1.35)}px` }}>
        <span className="cargador-anillo" aria-hidden="true" />
        <Logo tamano={tamano} />
      </div>
      <p>{texto}</p>
    </div>
  )
  return velo ? <div className="velo velo-carga">{contenido}</div> : contenido
}

// Animación de apertura: el logo se "firma" de izquierda a derecha
export function Intro({ saliendo }) {
  return (
    <div className={`intro ${saliendo ? 'saliendo' : ''}`} role="status" aria-label="Cargando AW_SistemCounting">
      <div className="intro-logo"><Logo tamano={260} /></div>
      <span className="intro-linea" aria-hidden="true" />
      <p className="intro-nombre">AW_SistemCounting</p>
    </div>
  )
}

// Campo de dinero: guarda texto mientras se escribe y entrega número al padre
export function CampoMonto({ etiqueta, valor, onCambio, onSalir, deshabilitado, autoFocus }) {
  const [texto, setTexto] = useState(valor ? String(valor) : '')
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      <div className="campo-monto">
        <i>₡</i>
        <input
          inputMode="decimal"
          placeholder="0"
          value={texto}
          disabled={deshabilitado}
          autoFocus={autoFocus}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const t = e.target.value.replace(/[^\d.,\s]/g, '')
            setTexto(t)
            onCambio(aNumero(t))
          }}
          onBlur={onSalir}
        />
      </div>
    </label>
  )
}

export function Confirmar({ titulo, children, textoSi = 'Sí, está bien', textoNo = 'Revisar', onSi, onNo, peligro }) {
  return (
    <div className="velo" onClick={onNo}>
      <div className="dialogo" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>
        <div className="dialogo-cuerpo">{children}</div>
        <div className="acciones">
          <button className="btn secundario" onClick={onNo}>{textoNo}</button>
          <button className={`btn ${peligro ? 'peligro' : 'primario'}`} onClick={onSi}>{textoSi}</button>
        </div>
      </div>
    </div>
  )
}

export function Fila({ etiqueta, valor, fuerte, tono }) {
  return (
    <div className={`fila ${fuerte ? 'fuerte' : ''} ${tono ?? ''}`}>
      <span>{etiqueta}</span>
      <b>{valor}</b>
    </div>
  )
}

export function NotasDelDia({ filas }) {
  const conNota = filas.filter((f) => f.nota?.trim())
  if (!conNota.length) return null
  return (
    <div className="tarjeta">
      <h4>Notas <small>({conNota.length})</small></h4>
      <ul className="lista-notas">
        {conNota.map((f) => <li key={f.id}><b>{f.nombre}</b><p>{f.nota}</p></li>)}
      </ul>
    </div>
  )
}

// Totales de contado por cliente (resumen, registros y confirmación)
export function TablaContado({ jugadas }) {
  const r = resumirContado(jugadas)
  if (!r.cantidad) return <p className="vacio">Sin jugadas de contado.</p>
  return (
    <div className="tabla-scroll">
      <table className="tabla">
        <thead><tr><th>Cliente</th><th>Jugado</th><th>Premios</th><th>Total</th></tr></thead>
        <tbody>
          {r.clientes.map((c) => (
            <tr key={c.cliente_id}>
              <td>{c.nombre}{c.jugadas > 1 && <small className="veces"> ×{c.jugadas}</small>}</td>
              <td>{dinero(c.monto)}</td>
              <td>{c.premio ? `− ${dinero(c.premio)}` : '—'}</td>
              <td className={c.neto < 0 ? 'negativo' : ''}><b>{dinero(c.neto)}</b></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Totales</td>
            <td>{dinero(r.monto)}</td>
            <td>{r.premio ? `− ${dinero(r.premio)}` : '—'}</td>
            <td className={r.neto < 0 ? 'negativo' : ''}><b>{dinero(r.neto)}</b></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// Cuadre: jugadas y premios por separado; si no coinciden, cuánto falta o sobra de cada uno
export function Cuadre({ cuadre }) {
  const tono = cuadre.cuadra ? 'ok'
    : cuadre.ventas.diferencia < 0 || cuadre.premios.diferencia < 0 ? 'falta' : 'sobra'
  return (
    <div className={`cuadre ${tono}`} role="status" aria-live="polite">
      {cuadre.cuadra ? (
        <p className="cuadre-msj">✓ Cuadra</p>
      ) : (
        <ul className="cuadre-lista">
          <MensajeCuadre de="jugadas" f={cuadre.ventas} />
          <MensajeCuadre de="premios" f={cuadre.premios} />
        </ul>
      )}
      <div className="cuadre-ref">
        <FilaCuadre titulo="Jugado" f={cuadre.ventas} />
        <FilaCuadre titulo="Premios" f={cuadre.premios} />
      </div>
    </div>
  )
}

// Menos registrado que lo anotado al inicio = hace falta; más = sobra
function MensajeCuadre({ de, f }) {
  if (f.diferencia === 0) return null
  const falta = f.diferencia < 0
  return (
    <li className={`cuadre-msj ${falta ? 'falta' : 'sobra'}`}>
      {falta ? 'Hace falta dinero' : 'Sobra dinero'} {dinero(Math.abs(f.diferencia))} de {de}
    </li>
  )
}

function FilaCuadre({ titulo, f }) {
  return (
    <p className={f.diferencia === 0 ? '' : 'distinto'}>
      <span>{titulo}</span> {dinero(f.registrado)} <small>de {dinero(f.anotado)}</small>
    </p>
  )
}
