import {
  formatoMoneda,
  mesActual,
  nombreMes,
  pagosDelMes,
  clientePagado,
  estacionPorId,
  store,
} from '../store.js';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), []);
  const { clientes, estaciones, pagos } = store.getState();
  const mes = mesActual();
  const pagosMes = pagosDelMes(mes);

  const esperado = clientes.reduce((s, c) => s + (c.pagoMensual || 0), 0);
  const cobrado = pagosMes.reduce((s, p) => s + (p.monto || 0), 0);
  const pagados = clientes.filter((c) => clientePagado(c.id, mes)).length;
  const pendientes = clientes.length - pagados;

  // Por estación
  const porEstacion = estaciones.map((e) => {
    const cls = clientes.filter((c) => c.estacionId === e.id);
    const esp = cls.reduce((s, c) => s + (c.pagoMensual || 0), 0);
    const cob = pagosMes
      .filter((p) => p.estacionId === e.id)
      .reduce((s, p) => s + (p.monto || 0), 0);
    const nPagados = cls.filter((c) => clientePagado(c.id, mes)).length;
    return { estacion: e, total: cls.length, esperado: esp, cobrado: cob, pagados: nPagados };
  });

  // Por administrador (mes actual y total histórico)
  const porAdmin = {};
  pagos.forEach((p) => {
    const k = p.registradoPor || 'sistema';
    porAdmin[k] = porAdmin[k] || { email: k, mes: 0, total: 0, count: 0 };
    porAdmin[k].total += p.monto || 0;
    porAdmin[k].count += 1;
    if (p.mes === mes) porAdmin[k].mes += p.monto || 0;
  });
  const admins = Object.values(porAdmin).sort((a, b) => b.total - a.total);

  return (
    <div>
      <div className="cards">
        <div className="card">
          <h3>Clientes totales</h3>
          <div className="big">{clientes.length}</div>
          <div className="sub">{estaciones.length} estaciones</div>
        </div>
        <div className="card">
          <h3>Ingreso mensual esperado</h3>
          <div className="big">{formatoMoneda(esperado)}</div>
          <div className="sub">Suma de las mensualidades</div>
        </div>
        <div className="card">
          <h3>Cobrado en {nombreMes(mes)}</h3>
          <div className="big">{formatoMoneda(cobrado)}</div>
          <div className="sub">
            {pagados} de {clientes.length} clientes pagaron
          </div>
        </div>
        <div className="card">
          <h3>Pendiente en {nombreMes(mes)}</h3>
          <div className="big">{formatoMoneda(esperado - cobrado)}</div>
          <div className="sub">{pendientes} clientes sin pagar</div>
        </div>
      </div>

      <div className="section">
        <h2>Por estación — {nombreMes(mes)}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Estación</th>
                <th>Clientes</th>
                <th>Pagaron</th>
                <th>Esperado / mes</th>
                <th>Cobrado</th>
                <th>Pendiente</th>
                <th>Avance</th>
              </tr>
            </thead>
            <tbody>
              {porEstacion.map((r) => (
                <tr key={r.estacion.id}>
                  <td>
                    <b>{r.estacion.nombre}</b>
                    <br />
                    <span className="muted">{r.estacion.ubicacion}</span>
                  </td>
                  <td>{r.total}</td>
                  <td>
                    {r.pagados} / {r.total}
                  </td>
                  <td>{formatoMoneda(r.esperado)}</td>
                  <td>{formatoMoneda(r.cobrado)}</td>
                  <td>{formatoMoneda(r.esperado - r.cobrado)}</td>
                  <td style={{ minWidth: 120 }}>
                    {r.esperado > 0 ? Math.round((r.cobrado / r.esperado) * 100) : 0}%
                    <div className="progress">
                      <div
                        style={{
                          width: `${r.esperado > 0 ? (r.cobrado / r.esperado) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h2>Dinero registrado por administrador</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Administrador</th>
                <th>Pagos registrados</th>
                <th>En {nombreMes(mes)}</th>
                <th>Total histórico</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.email}>
                  <td>{a.email}</td>
                  <td>{a.count}</td>
                  <td>{formatoMoneda(a.mes)}</td>
                  <td>
                    <b>{formatoMoneda(a.total)}</b>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan="4" className="muted">
                    Aún no hay pagos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h2>Últimos pagos</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Estación</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {[...pagos]
                .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
                .slice(0, 8)
                .map((p) => (
                  <tr key={p.id}>
                    <td>{p.fecha}</td>
                    <td>{p.clienteNombre}</td>
                    <td>{estacionPorId(p.estacionId)?.nombre || '—'}</td>
                    <td>{formatoMoneda(p.monto)}</td>
                    <td>{p.metodo}</td>
                    <td className="muted">{p.registradoPor}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
