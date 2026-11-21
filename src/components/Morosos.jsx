import { useState, useEffect } from 'react';
import {
  store,
  morososDelMes,
  formatoMoneda,
  mesActual,
  nombreMes,
  estacionPorId,
  mensajeWhatsApp,
} from '../store.js';

// Estado de la fecha de pago respecto a hoy (mes actual).
function estadoVencimiento(cliente) {
  const hoy = new Date();
  const diaHoy = hoy.getDate();
  const dia = cliente.diaPago || 1;
  if (dia < diaHoy) return { texto: 'Vencido', clase: 'pending' };
  if (dia - diaHoy <= 3) return { texto: 'Próximo a vencer', clase: 'soon' };
  return { texto: 'Pendiente', clase: 'pending' };
}

export default function Morosos() {
  const [, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), []);
  const { estaciones } = store.getState();
  const [filtroEstacion, setFiltroEstacion] = useState('');
  const mes = mesActual();
  const morosos = morososDelMes(mes).filter(
    (c) => !filtroEstacion || c.estacionId === filtroEstacion,
  );
  const totalPendiente = morosos.reduce((s, c) => s + (c.pagoMensual || 0), 0);

  return (
    <div>
      <div className="cards">
        <div className="card">
          <h3>Clientes sin pagar en {nombreMes(mes)}</h3>
          <div className="big">{morosos.length}</div>
        </div>
        <div className="card">
          <h3>Monto pendiente por cobrar</h3>
          <div className="big">{formatoMoneda(totalPendiente)}</div>
        </div>
      </div>

      <div className="toolbar">
        <select value={filtroEstacion} onChange={(e) => setFiltroEstacion(e.target.value)}>
          <option value="">Todas las estaciones</option>
          {estaciones.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        <span className="muted">
          El botón de WhatsApp abre el chat con un mensaje ya escrito
          recordando la fecha de pago.
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Estación</th>
              <th>Teléfono</th>
              <th>Monto</th>
              <th>Vence</th>
              <th>Estado</th>
              <th>Recordatorio</th>
            </tr>
          </thead>
          <tbody>
            {morosos.map((c) => {
              const est = estadoVencimiento(c);
              return (
                <tr key={c.id}>
                  <td>
                    <b>{c.nombre}</b>
                    <br />
                    <span className="muted">{c.ubicacion}</span>
                  </td>
                  <td>{estacionPorId(c.estacionId)?.nombre || '—'}</td>
                  <td>{c.telefono}</td>
                  <td>{formatoMoneda(c.pagoMensual)}</td>
                  <td>Día {c.diaPago} de {nombreMes(mes)}</td>
                  <td>
                    <span className={`pill ${est.clase}`}>{est.texto}</span>
                  </td>
                  <td>
                    <a
                      className="btn btn-wa btn-sm"
                      href={mensajeWhatsApp(c, estacionPorId(c.estacionId), mes)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      💬 WhatsApp
                    </a>
                  </td>
                </tr>
              );
            })}
            {morosos.length === 0 && (
              <tr>
                <td colSpan="7" className="muted">
                  🎉 Todos los clientes pagaron este mes. No hay morosos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
