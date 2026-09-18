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
import Retomar from './etapas/Retomar.jsx'
import Notificaciones from './etapas/Notificaciones.jsx'
import { cuentasAltas, promediosClientes, rangoPromedio } from './lib/analisis.js'

const PASOS = ['Ventas', 'Clientes', 'Resumen']

export default function App() {
  const [usuario, setUsuario] = useState(undefined) // undefined = cargando
  const [fecha, setFecha] = useState(hoyCR())
  const [cierre, setCierre] = useState(null)
  const [faltantes, setFaltantes] = useState([]) // días sin cierre por retomar
  const [avisos, setAvisos] = useState(null)
  const [verAvisos, setVerAvisos] = useState(false)
  const [error, setError] = useState('')
  const [vista, setVista] = useState('cierre') // 'cierre' | 'registros'
  const [intro, setIntro] = useState('mostrando') // 'mostrando' | 'saliendo' | 'lista'

  // La apertura dura lo que su animación (~2 s) o lo que tarde la sesión, lo que sea mayor
  useEffect(() => {
    const animacion = new Promise((r) => setTimeout(r, 2100))
    Promise.all([datos.sesionActual().catch(() => null), animacion]).then(([u]) => {
      setUsuario(u ?? null)
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
    setCierre(null)
    try {
      // Si hubo días sin usar la app, primero se decide cómo retomar
      const dias = await datos.diasFaltantes(fecha)
      setFaltantes(dias)
      if (!dias.length) setCierre(await datos.obtenerCierre(fecha))
    } catch (e) {
      setError(e.message)
    }
  }, [fecha])

  useEffect(() => {
    if (usuario) cargarCierre()
    else setCierre(null)
  }, [usuario, cargarCierre])

  // Recordatorios de notas + cuentas altas (no bloquean el cierre si fallan)
  const cargarAvisos = useCallback(async () => {
    try {
      const [desde, hasta] = rangoPromedio(fecha)
      const [recordatorios, clientes, movs] = await Promise.all([
        datos.listarRecordatorios(), datos.listarClientes(fecha), datos.movimientosEntre(desde, hasta),
      ])
      setAvisos({ recordatorios, altas: cuentasAltas(clientes, promediosClientes(movs)) })
    } catch {
      setAvisos((a) => a ?? { recordatorios: [], altas: [] })
    }
  }, [fecha])

  useEffect(() => {
    if (usuario) cargarAvisos()
  }, [usuario, cargarAvisos, cierre?.etapa, vista])

  async function marcarAviso(id) {
    await datos.marcarRecordatorio(id)
    cargarAvisos()
  }

  const pendientesHoy = avisos
    ? avisos.recordatorios.filter((r) => r.fecha <= fecha).length + avisos.altas.length
    : 0

  async function salir() {
    await datos.cerrarSesion()
    setVista('cierre')
    setUsuario(null)
  }

  const verRegistros = () => { setVista('registros'); window.scrollTo(0, 0) }

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
        <div className="barra-acciones">
          <button className="campana" onClick={() => { setVerAvisos(true); cargarAvisos() }}
            aria-label={pendientesHoy ? `Notificaciones: ${pendientesHoy} pendientes` : 'Notificaciones'}>
            <IconoCampana />
            {pendientesHoy > 0 && <span className="insignia">{pendientesHoy > 9 ? '9+' : pendientesHoy}</span>}
          </button>
          <button className="btn fantasma" onClick={salir}>Salir</button>
        </div>
      </header>
      {verAvisos && (
        <Notificaciones avisos={avisos} hoy={fecha} onMarcar={marcarAviso} onCerrar={() => setVerAvisos(false)} />
      )}

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
            {cierre.tipo === 'atrasado' ? 'Registrando el cierre atrasado del' : 'Tenés pendiente el cierre del'}{' '}
            <b>{fechaLarga(cierre.fecha)}</b>. Finalizalo para seguir con el siguiente.
          </p>
        )}
        {vista === 'cierre' && faltantes.length > 0 && (
          <Retomar faltantes={faltantes} hoy={fecha} onListo={cargarCierre} onVerRegistros={verRegistros} />
        )}
        {vista === 'cierre' && !faltantes.length && <>
          {!cierre && !error && <Cargando texto="Preparando el cierre de hoy…" />}
          {cierre?.etapa === 1 && (
            <Etapa1 cierre={cierre} setCierre={setCierre} onSiguiente={() => irAEtapa(2)}
              onVerRegistros={verRegistros} />
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

function IconoCampana() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}
