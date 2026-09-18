import { useState } from 'react'
import * as datos from '../lib/datos.js'
import { Cargando, Logo } from '../componentes.jsx'

export default function Login({ onEntrar }) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [verClave, setVerClave] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      onEntrar(await datos.iniciarSesion(usuario, clave))
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      <form className="login-caja" onSubmit={entrar}>
        <Logo tamano={190} />
        <h1>Inicio de sesión</h1>
        <p className="login-sistema">AW_SistemCounting</p>

        <label className="campo">
          <span>Usuario</span>
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)}
            autoCapitalize="none" autoComplete="username" autoFocus required />
        </label>
        <div className="campo">
          <label htmlFor="clave"><span>Contraseña</span></label>
          <div className="campo-clave">
            <input id="clave" type={verClave ? 'text' : 'password'} value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
            <button type="button" className="ver-clave" onClick={() => setVerClave(!verClave)}
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={verClave}
              title={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {verClave ? <IconoOjoCerrado /> : <IconoOjo />}
            </button>
          </div>
        </div>

        {error && <p className="aviso error">{error}</p>}
        <button className="btn primario ancho" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        {datos.modoDemo && <p className="pista">Demo: usuario <b>demo</b> · contraseña <b>1234</b></p>}
      </form>
      {enviando && <Cargando velo texto="Entrando…" />}
    </div>
  )
}

const propsIcono = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}

function IconoOjo() {
  return (
    <svg {...propsIcono}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconoOjoCerrado() {
  return (
    <svg {...propsIcono}>
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  )
}
