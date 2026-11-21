import { useState, useEffect } from 'react';
import { store, initStore, logout } from './store.js';
import { firebaseConfigured } from './firebase.js';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import Clientes from './components/Clientes.jsx';
import Estaciones from './components/Estaciones.jsx';
import Pagos from './components/Pagos.jsx';
import Morosos from './components/Morosos.jsx';
import Reportes from './components/Reportes.jsx';
import MiPago from './components/MiPago.jsx';

const VISTAS_ADMIN = [
  { id: 'dashboard', titulo: 'Dashboard', etiqueta: '📊 Dashboard' },
  { id: 'clientes', titulo: 'Clientes', etiqueta: '👥 Clientes' },
  { id: 'estaciones', titulo: 'Estaciones', etiqueta: '📡 Estaciones' },
  { id: 'pagos', titulo: 'Registrar pagos', etiqueta: '💵 Pagos' },
  { id: 'morosos', titulo: 'Clientes sin pagar', etiqueta: '⏰ Morosos' },
  { id: 'reportes', titulo: 'Reportes', etiqueta: '📄 Reportes' },
];

export default function App() {
  const [snap, setSnap] = useState(store.getState());
  const [vista, setVista] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = store.subscribe(setSnap);
    initStore();
    return unsubscribe;
  }, []);

  const { user, loaded, online, pending, mode } = snap;

  if (!loaded) {
    return (
      <div className="login-wrap">
        <p style={{ color: '#fff' }}>Cargando…</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => setVista('dashboard')} />;
  }

  const esAdmin = user.rol === 'admin';
  const vistas = esAdmin
    ? VISTAS_ADMIN
    : [{ id: 'mipago', titulo: 'Mi pago', etiqueta: '💳 Mi pago' }];
  const vistaActual = vistas.find((v) => v.id === vista) || vistas[0];

  async function salir() {
    await logout();
    setVista('dashboard');
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>📶 Control de Clientes</h2>
        <p className="tagline">Internet · clientes y pagos</p>
        {vistas.map((v) => (
          <button
            key={v.id}
            className={`nav-btn ${vistaActual.id === v.id ? 'active' : ''}`}
            onClick={() => setVista(v.id)}
          >
            {v.etiqueta}
          </button>
        ))}
        <div className="user-box">
          <b>{user.nombre}</b>
          <br />
          {user.email}
          <br />
          {esAdmin ? 'Administrador' : 'Cliente'}
          <br />
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={salir}>
            Salir
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{vistaActual.titulo}</h1>
          <span className={`badge ${online ? 'online' : 'offline'}`}>
            <span className="dot" />
            {online ? 'En línea' : 'Sin conexión'}
          </span>
          {pending > 0 && (
            <span className="badge pending">
              ⏳ {pending} cambio{pending === 1 ? '' : 's'} pendiente
              {pending === 1 ? '' : 's'} por sincronizar
            </span>
          )}
          {mode === 'demo' ? (
            <span
              className="badge demo"
              title="Los datos se guardan en este navegador (localStorage). Conecta Firebase para consultarlos en línea desde cualquier dispositivo."
            >
              Modo demo (sin Firebase)
            </span>
          ) : (
            <span className="badge firebase">Firebase conectado</span>
          )}
        </header>
        <main className="content">
          {vistaActual.id === 'dashboard' && <Dashboard />}
          {vistaActual.id === 'clientes' && <Clientes />}
          {vistaActual.id === 'estaciones' && <Estaciones />}
          {vistaActual.id === 'pagos' && <Pagos />}
          {vistaActual.id === 'morosos' && <Morosos />}
          {vistaActual.id === 'reportes' && <Reportes />}
          {vistaActual.id === 'mipago' && <MiPago user={user} />}
        </main>
      </div>
    </div>
  );
}
