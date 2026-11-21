import { useState, useEffect } from 'react';
import {
  store,
  registrarPago,
  eliminarPago,
  formatoMoneda,
  mesActual,
  nombreMes,
  estacionPorId,
  clientePagado,
} from '../store.js';

export default function Pagos() {
  const [, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), []);
  const { clientes, estaciones, pagos, user } = store.getState();
  const hoy = new Date().toISOString().slice(0, 10);
  const [estacionId, setEstacionId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [mes, setMes] = useState(mesActual());
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [fecha, setFecha] = useState(hoy);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const clientesEstacion = clientes.filter(
    (c) => !estacionId || c.estacionId === estacionId,
  );
  const clienteSel = clientes.find((c) => c.id === clienteId);

  useEffect(() => {
    if (clienteSel) setMonto(String(clienteSel.pagoMensual));
  }, [clienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!clienteId) {
      setError('Selecciona un cliente.');
      return;
    }
    const r = await registrarPago({
      clienteId,
      mes,
      monto: Number(monto),
      metodo,
      fecha,
    });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setMsg(`Pago de ${formatoMoneda(monto)} registrado para ${clienteSel.nombre} (${nombreMes(mes)}).`);
    setClienteId('');
    setMonto('');
  }

  const recientes = [...pagos]
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
    .slice(0, 20);

  return (
    <div>
      <div className="form-card">
        <h2 style={{ marginTop: 0 }}>Registrar pago</h2>
        <form onSubmit={guardar}>
          <div className="form-grid">
            <div>
              <label>Estación</label>
              <select
                value={estacionId}
                onChange={(e) => { setEstacionId(e.target.value); setClienteId(''); }}
              >
                <option value="">Todas</option>
                {estaciones.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Cliente *</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                <option value="">Selecciona…</option>
                {clientesEstacion.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} — {formatoMoneda(c.pagoMensual)}
                    {clientePagado(c.id, mes) ? ' (ya pagó este mes)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Mes</label>
              <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} required />
            </div>
            <div>
              <label>Monto (MXN) *</label>
              <input type="number" min="0" step="1" value={monto} onChange={(e) => setMonto(e.target.value)} required />
            </div>
            <div>
              <label>Método</label>
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="deposito">Deposito Oxxo</option>
              </select>
            </div>
            <div>
              <label>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
          </div>
          <p className="muted" style={{ fontSize: '.88rem' }}>
            Registrado por: <b>{user?.email}</b>. Al guardar, el cliente queda
            marcado como pagado en {nombreMes(mes)}.
          </p>
          {error && <div className="error">{error}</div>}
          <div className="form-actions">
            <button className="btn btn-green" type="submit">Registrar pago</button>
            {msg && <span className="muted">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="section">
        <h2>Pagos recientes</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Estación</th>
                <th>Mes</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Registrado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((p) => (
                <tr key={p.id}>
                  <td>{p.fecha}</td>
                  <td>{p.clienteNombre}</td>
                  <td>{estacionPorId(p.estacionId)?.nombre || '—'}</td>
                  <td>{nombreMes(p.mes)}</td>
                  <td>{formatoMoneda(p.monto)}</td>
                  <td>{p.metodo === 'efectivo' ? 'Efectivo' : p.metodo === 'transferencia' ? 'Transferencia' : 'Deposito Oxxo'}</td>
                  <td className="muted">{p.registradoPor}</td>
                  <td>
                    <button
                      className="btn btn-red btn-sm"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el pago de ${p.clienteNombre} (${formatoMoneda(p.monto)})? El cliente volverá a aparecer como pendiente ese mes.`)) {
                          eliminarPago(p.id);
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {recientes.length === 0 && (
                <tr>
                  <td colSpan="8" className="muted">Aún no hay pagos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
