import { useState, useEffect } from 'react';
import {
  store,
  formatoMoneda,
  mesActual,
  nombreMes,
  pagosDelMes,
  clientePagado,
} from '../store.js';

export default function Reportes() {
  const [, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), []);
  const { clientes, estaciones, pagos } = store.getState();
  const [mes, setMes] = useState(mesActual());
  const pagosMes = pagosDelMes(mes);

  // Por estación
  const porEstacion = estaciones.map((e) => {
    const cls = clientes.filter((c) => c.estacionId === e.id);
    const esperado = cls.reduce((s, c) => s + (c.pagoMensual || 0), 0);
    const cobrado = pagosMes
      .filter((p) => p.estacionId === e.id)
      .reduce((s, p) => s + (p.monto || 0), 0);
    const nPagados = cls.filter((c) => clientePagado(c.id, mes)).length;
    return { estacion: e, clientes: cls.length, pagados: nPagados, esperado, cobrado };
  });
  const totEsperado = porEstacion.reduce((s, r) => s + r.esperado, 0);
  const totCobrado = porEstacion.reduce((s, r) => s + r.cobrado, 0);

  // Por administrador (en el mes seleccionado)
  const porAdmin = {};
  pagosMes.forEach((p) => {
    const k = p.registradoPor || 'sistema';
    porAdmin[k] = porAdmin[k] || { email: k, count: 0, total: 0 };
    porAdmin[k].count += 1;
    porAdmin[k].total += p.monto || 0;
  });
  const admins = Object.values(porAdmin).sort((a, b) => b.total - a.total);

  // Meses con actividad (para el selector rápido)
  const meses = [...new Set(pagos.map((p) => p.mes))].sort().reverse();

  return (
    <div>
      <div className="toolbar no-print">
        <label>
          Mes:{' '}
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
        </label>
        {meses.map((m) => (
          <button
            key={m}
            className={`btn btn-sm ${m === mes ? '' : 'btn-ghost'}`}
            onClick={() => setMes(m)}
          >
            {nombreMes(m)}
          </button>
        ))}
        <button className="btn btn-sm" onClick={() => window.print()}>
          🖨️ Imprimir / guardar PDF
        </button>
      </div>

      <div className="section">
        <h2>Reporte por estación — {nombreMes(mes)}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Estación</th>
                <th>Clientes</th>
                <th>Pagaron</th>
                <th>Esperado</th>
                <th>Cobrado</th>
                <th>Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {porEstacion.map((r) => (
                <tr key={r.estacion.id}>
                  <td>
                    <b>{r.estacion.nombre}</b>
                  </td>
                  <td>{r.clientes}</td>
                  <td>
                    {r.pagados} / {r.clientes}
                  </td>
                  <td>{formatoMoneda(r.esperado)}</td>
                  <td>{formatoMoneda(r.cobrado)}</td>
                  <td>{formatoMoneda(r.esperado - r.cobrado)}</td>
                </tr>
              ))}
              <tr>
                <td><b>Total</b></td>
                <td><b>{clientes.length}</b></td>
                <td>
                  <b>
                    {porEstacion.reduce((s, r) => s + r.pagados, 0)} / {clientes.length}
                  </b>
                </td>
                <td><b>{formatoMoneda(totEsperado)}</b></td>
                <td><b>{formatoMoneda(totCobrado)}</b></td>
                <td><b>{formatoMoneda(totEsperado - totCobrado)}</b></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h2>Reporte por administrador — {nombreMes(mes)}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Administrador</th>
                <th>Pagos registrados</th>
                <th>Total cobrado</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.email}>
                  <td>{a.email}</td>
                  <td>{a.count}</td>
                  <td>
                    <b>{formatoMoneda(a.total)}</b>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan="3" className="muted">
                    No hay pagos registrados en {nombreMes(mes)}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h2>Detalle de pagos — {nombreMes(mes)}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {[...pagosMes]
                .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
                .map((p) => (
                  <tr key={p.id}>
                    <td>{p.fecha}</td>
                    <td>{p.clienteNombre}</td>
                    <td>{formatoMoneda(p.monto)}</td>
                    <td>{p.metodo}</td>
                    <td className="muted">{p.registradoPor}</td>
                  </tr>
                ))}
              {pagosMes.length === 0 && (
                <tr>
                  <td colSpan="5" className="muted">
                    Sin pagos en este mes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
