import { useState } from 'react'
import { aNumero } from './lib/formato.js'

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
