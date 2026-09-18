import { useCallback, useEffect, useState } from 'react'
import * as datos from './lib/datos.js'
import { hoyCR, fechaLarga } from './lib/formato.js'
import { Cargando, Intro, Logo } from './componentes.jsx'
import Login from './etapas/Login.jsx'
import Etapa1 from './etapas/Etapa1Ventas.jsx'
import Etapa2 from './etapas/Etapa2Clientes.jsx'
import Etapa3 from './etapas/Etapa3Resumen.jsx'
import Fin from './etapas/Fin.jsx'
import Registros from './etapas/Registros.jsx'

const PASOS = ['Ventas', 'Clientes', 'Resumen']

export default function App() {
  const [usuario, setUsuario] = useState(undefined) // undefined = cargando
  const [fecha, setFecha] = useState(hoyCR())
  const [cierre, setCierre] = useState(null)
  const [error, setError] = useState('')
  const [vista, setVista] = useState('cierre') // 'cierre' | 'registros'
  const [intro, setIntro] = useState('mostrando') // 'mostrando' | 'saliendo' | 'lista'

  // La apertura dura lo que su animación (~2 s) o lo que tarde la sesión, lo que sea mayor
  useEffect(() => {
    const animacion = new Promise((r) => setTimeout(r, 2100))
    Promise.all([datos.sesionActual().catch(() => null), animacion]).then(([u]) => {
      setUsuario(u)
      setIntro('saliendo')
      setTimeout(() => setIntro('lista'), 450)
    })
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
    setVista('cierre')
    setUsuario(null)
  }

  async function irAEtapa(etapa) {
    setCierre(await datos.actualizarCierre(cierre.id, { etapa }))
    window.scrollTo(0, 0)
  }

  const apertura = intro !== 'lista' && <Intro saliendo={intro === 'saliendo'} />
  if (usuario === undefined) return apertura
  if (!usuario) return <>{apertura}<Login onEntrar={setUsuario} /></>

  return (
    <div className="app">
      {apertura}
      <header className="barra">
        <div className="barra-marca">
          <Logo tamano={90} />
          <div>
            <strong>{usuario.nombre}</strong>
            <small>{fechaLarga(fecha)}</small>
          </div>
        </div>
        <button className="btn fantasma" onClick={salir}>Salir</button>
      </header>

      {vista === 'cierre' && cierre && cierre.etapa < 4 && (
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
        {vista === 'registros' && <Registros onVolver={() => setVista('cierre')} />}
        {vista === 'cierre' && cierre && cierre.fecha < fecha && cierre.etapa < 4 && (
          <p className="aviso pendiente">
            Tenés pendiente el cierre del <b>{fechaLarga(cierre.fecha)}</b>. Finalizalo para habilitar el de hoy.
          </p>
        )}
        {vista === 'cierre' && <>
          {!cierre && !error && <Cargando texto="Preparando el cierre de hoy…" />}
          {cierre?.etapa === 1 && (
            <Etapa1 cierre={cierre} setCierre={setCierre} onSiguiente={() => irAEtapa(2)}
              onVerRegistros={() => { setVista('registros'); window.scrollTo(0, 0) }} />
          )}
          {cierre?.etapa === 2 && <Etapa2 cierre={cierre} onAtras={() => irAEtapa(1)} onSiguiente={() => irAEtapa(3)} />}
          {cierre?.etapa === 3 && <Etapa3 cierre={cierre} setCierre={setCierre} onAtras={() => irAEtapa(2)} />}
          {cierre?.etapa === 4 && (
            <Fin cierre={cierre} hoy={fecha} onSalir={salir} onContinuar={cargarCierre}
              onVerRegistros={() => setVista('registros')} />
          )}
        </>}
      </main>

      {datos.modoDemo && <p className="marca-demo">Modo demo · datos solo en este dispositivo</p>}
    </div>
  )
}
