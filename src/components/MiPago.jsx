import { useState, useEffect } from 'react';
import {
  store,
  formatoMoneda,
  mesActual,
  nombreMes,
  pagoDeCliente,
  estacionPorId,
  clientePorId,
} from '../store.js';

export default function MiPago({ user }) {
  const [, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), []);
  const { pagos } = store.getState();
  const mes = mesActual();
  const cliente = clientePorId(user.clienteId);
  if (!cliente) {
    return (
      <div className="card">
        <p>
          Tu usuario no está ligado a ningún cliente. Pídele al administrador
          que asocie tu cuenta con tu ficha de cliente.
        </p>
      </div>
    );
  }
  const estacion = estacionPorId(cliente.estacionId);
  const pagoMes = pagoDeCliente(cliente.id, mes);
  const historial = pagos
    .filter((p) => p.clienteId === cliente.id)
    .sort((a, b) => (b.mes || '').localeCompare(a.mes || ''));

  return (
    <div>
      <div className="cards">
        <div className="card">
          <h3>Tu pago de {nombreMes(mes)}</h3>
          <div className="big">{formatoMoneda(cliente.pagoMensual)}</div>
          <div className="sub">
            Vence el día {cliente.diaPago} · {estacion?.nombre || ''}
          </div>
          <div style={{ marginTop: 10 }}>
            <span className={`pill ${pagoMes ? 'paid' : 'pending'}`}>
              {pagoMes ? '✅ Pagado' : '⏳ Pendiente'}
            </span>
          </div>
          {pagoMes && (
            <div className="sub" style={{ marginTop: 8 }}>
              Pagado el {pagoMes.fecha} por {pagoMes.metodo}.
            </div>
          )}
        </div>
        <div className="card">
          <h3>Tus datos</h3>
          <div><b>{cliente.nombre}</b></div>
          <div className="muted">{cliente.ubicacion}</div>
          <div className="muted">Tel: {cliente.telefono}</div>
          <div className="muted">IP: {cliente.ip}</div>
          <div className="muted">Estación: {estacion?.nombre || '—'}</div>
        </div>
      </div>

      <div className="section">
        <h2>Tu historial de pagos</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Fecha de pago</th>
                <th>Monto</th>
                <th>Método</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((p) => (
                <tr key={p.id}>
                  <td>{nombreMes(p.mes)}</td>
                  <td>{p.fecha}</td>
                  <td>{formatoMoneda(p.monto)}</td>
                  <td>{p.metodo}</td>
                </tr>
              ))}
              {historial.length === 0 && (
                <tr>
                  <td colSpan="4" className="muted">
                    Aún no tienes pagos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Si tu pago no aparece, contacta al administrador de tu estación.
        </p>
      </div>
    </div>
  );
}
