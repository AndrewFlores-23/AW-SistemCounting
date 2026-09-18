import { useState } from 'react'
import * as datos from '../lib/datos.js'
import { Cargando, Logo } from '../componentes.jsx'

export default function Login({ onEntrar }) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

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
        <label className="campo">
          <span>Contraseña</span>
          <input type="password" value={clave} onChange={(e) => setClave(e.target.value)}
            autoComplete="current-password" required />
        </label>

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
