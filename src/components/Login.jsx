import { useState } from 'react';
import { login } from '../store.js';
import { firebaseConfigured } from '../firebase.js';
import { DEMO_ACCOUNTS } from '../store.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    const r = await login(email, password);
    setCargando(false);
    if (r.ok) onLogin(r.user);
    else setError(r.error);
  }

  function llenar(cuenta) {
    setEmail(cuenta.email);
    setPassword(cuenta.password);
    setError('');
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={enviar}>
        <h1>📶 Control de Clientes</h1>
        <p className="sub">Internet · clientes, estaciones y pagos</p>
        <label htmlFor="email">Correo</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        {error && <div className="error">{error}</div>}
        <button className="btn btn-block" type="submit" disabled={cargando}>
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>

        {!firebaseConfigured && (
          <div className="demo-box">
            <b>Cuentas demo</b> (toca una para llenar el formulario):
            {DEMO_ACCOUNTS.map((c) => (
              <div key={c.email}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ margin: '4px 4px 0 0' }}
                  onClick={() => llenar(c)}
                >
                  {c.nombre}
                </button>
                <code>{c.email}</code>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              Contraseñas: admin <code>Admin123!</code> · cobros{' '}
              <code>Cobros123!</code> · cliente <code>Cliente123!</code>
            </div>
          </div>
        )}
        {firebaseConfigured && (
          <div className="demo-box">
            Conectado a Firebase. Usa un correo y contraseña creados en
            Firebase Auth con su perfil en la colección <code>usuarios</code>.
          </div>
        )}
      </form>
    </div>
  );
}
