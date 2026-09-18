import { useCallback, useEffect, useState } from 'react'
import * as datos from './lib/datos.js'
import { hoyCR, fechaLarga } from './lib/formato.js'
import { Logo } from './componentes.jsx'
import Login from './etapas/Login.jsx'
import Etapa1 from './etapas/Etapa1Ventas.jsx'
import Etapa2 from './etapas/Etapa2Clientes.jsx'
import Etapa3 from './etapas/Etapa3Resumen.jsx'
import Fin from './etapas/Fin.jsx'

const PASOS = ['Ventas', 'Clientes', 'Resumen']

export default function App() {
  const [usuario, setUsuario] = useState(undefined) // undefined = cargando
  const [fecha, setFecha] = useState(hoyCR())
  const [cierre, setCierre] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    datos.sesionActual().then(setUsuario).catch(() => setUsuario(null))
  }, [])

  // El día cambia solo a medianoche de Costa Rica
  useEffect(() => {
    const t = setInterval(() => setFecha(hoyCR()), 30_000)
    return () => clearInterval(t)
  }, [])

  const cargarCierre = useCallback(async () => {
    setError('')
    try {
      setCierre(await datos.obtenerCierre(fecha))
    } catch (e) {
      setError(e.message)
    }
  }, [fecha])

  useEffect(() => {
    if (usuario) cargarCierre()
    else setCierre(null)
  }, [usuario, cargarCierre])

  async function salir() {
    await datos.cerrarSesion()
    setUsuario(null)
  }

  async function irAEtapa(etapa) {
    setCierre(await datos.actualizarCierre(cierre.id, { etapa }))
    window.scrollTo(0, 0)
  }

  if (usuario === undefined) return <div className="pantalla-carga"><Logo tamano={72} /></div>
  if (!usuario) return <Login onEntrar={setUsuario} />

  return (
    <div className="app">
      <header className="barra">
        <div className="barra-marca">
          <Logo tamano={34} />
          <div>
            <strong>{usuario.nombre}</strong>
            <small>{fechaLarga(fecha)}</small>
          </div>
        </div>
        <button className="btn fantasma" onClick={salir}>Salir</button>
      </header>

      {cierre && cierre.etapa < 4 && (
        <ol className="pasos">
          {PASOS.map((p, i) => (
            <li key={p} className={cierre.etapa === i + 1 ? 'actual' : cierre.etapa > i + 1 ? 'hecho' : ''}>
              <span>{i + 1}</span>{p}
            </li>
          ))}
        </ol>
      )}

      <main className="contenido">
        {error && <p className="aviso error">{error} <button className="btn fantasma" onClick={cargarCierre}>Reintentar</button></p>}
        {!cierre && !error && <p className="cargando">Cargando cierre…</p>}
        {cierre?.etapa === 1 && <Etapa1 cierre={cierre} setCierre={setCierre} onSiguiente={() => irAEtapa(2)} />}
        {cierre?.etapa === 2 && <Etapa2 cierre={cierre} onAtras={() => irAEtapa(1)} onSiguiente={() => irAEtapa(3)} />}
        {cierre?.etapa === 3 && <Etapa3 cierre={cierre} setCierre={setCierre} onAtras={() => irAEtapa(2)} />}
        {cierre?.etapa === 4 && <Fin cierre={cierre} onSalir={salir} />}
      </main>

      {datos.modoDemo && <p className="marca-demo">Modo demo · datos solo en este dispositivo</p>}
    </div>
  )
}
