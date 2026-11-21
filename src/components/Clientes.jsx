import { useState, useEffect } from 'react';
import {
  store,
  guardarCliente,
  eliminarCliente,
  formatoMoneda,
  mesActual,
  clientePagado,
  estacionPorId,
} from '../store.js';

const VACIO = {
  nombre: '',
  ubicacion: '',
  telefono: '',
  ip: '',
  pagoMensual: 300,
  estacionId: '',
  diaPago: 1,
};

export default function Clientes() {
  const [, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), []);
  const { clientes, estaciones } = store.getState();
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstacion, setFiltroEstacion] = useState('');
  const [form, setForm] = useState(VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [msg, setMsg] = useState('');
  const mes = mesActual();

  const filtrados = clientes.filter((c) => {
    const q = busqueda.trim().toLowerCase();
    const coincide =
      !q ||
      c.nombre.toLowerCase().includes(q) ||
      (c.telefono || '').includes(q) ||
      (c.ip || '').toLowerCase().includes(q);
    return coincide && (!filtroEstacion || c.estacionId === filtroEstacion);
  });

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function guardar(e) {
    e.preventDefault();
    const datos = {
      ...form,
      pagoMensual: Number(form.pagoMensual),
      diaPago: Math.min(31, Math.max(1, Number(form.diaPago) || 1)),
      estacionId: form.estacionId || estaciones[0]?.id || '',
    };
    await guardarCliente(datos, editandoId);
    setMsg(editandoId ? 'Cliente actualizado.' : 'Cliente registrado.');
    setForm(VACIO);
    setEditandoId(null);
  }

  function editar(c) {
    setForm({ ...c });
    setEditandoId(c.id);
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function borrar(c) {
    if (!window.confirm(`¿Eliminar a ${c.nombre}? Sus pagos registrados se conservan en reportes.`))
      return;
    await eliminarCliente(c.id);
    setMsg('Cliente eliminado.');
  }

  return (
    <div>
      <div className="form-card">
        <h2 style={{ marginTop: 0 }}>{editandoId ? 'Editar cliente' : 'Registrar cliente'}</h2>
        <form onSubmit={guardar}>
          <div className="form-grid">
            <div>
              <label>Nombre *</label>
              <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
            </div>
            <div>
              <label>Ubicación</label>
              <input value={form.ubicacion} onChange={(e) => set('ubicacion', e.target.value)} placeholder="Calle, colonia, referencias" />
            </div>
            <div>
              <label>Teléfono (10 dígitos) *</label>
              <input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} required inputMode="tel" placeholder="2221234567" />
            </div>
            <div>
              <label>IP</label>
              <input value={form.ip} onChange={(e) => set('ip', e.target.value)} placeholder="192.168.1.10" />
            </div>
            <div>
              <label>Pago mensual (MXN) *</label>
              <input type="number" min="0" step="1" value={form.pagoMensual} onChange={(e) => set('pagoMensual', e.target.value)} required />
            </div>
            <div>
              <label>Estación *</label>
              <select value={form.estacionId} onChange={(e) => set('estacionId', e.target.value)} required>
                <option value="">Selecciona…</option>
                {estaciones.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Día de pago (1–31)</label>
              <input type="number" min="1" max="31" value={form.diaPago} onChange={(e) => set('diaPago', e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn" type="submit">{editandoId ? 'Guardar cambios' : 'Registrar cliente'}</button>
            {editandoId && (
              <button type="button" className="btn btn-ghost" onClick={() => { setForm(VACIO); setEditandoId(null); }}>
                Cancelar edición
              </button>
            )}
            {msg && <span className="muted">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre, teléfono o IP…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={filtroEstacion} onChange={(e) => setFiltroEstacion(e.target.value)}>
          <option value="">Todas las estaciones</option>
          {estaciones.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        <span className="muted">{filtrados.length} de {clientes.length} clientes</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Estación</th>
              <th>Teléfono / IP</th>
              <th>Mensualidad</th>
              <th>Día pago</th>
              <th>Este mes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => {
              const pagado = clientePagado(c.id, mes);
              return (
                <tr key={c.id}>
                  <td>
                    <b>{c.nombre}</b>
                    <br />
                    <span className="muted">{c.ubicacion}</span>
                  </td>
                  <td>{estacionPorId(c.estacionId)?.nombre || '—'}</td>
                  <td>
                    {c.telefono}
                    <br />
                    <span className="muted">{c.ip}</span>
                  </td>
                  <td>{formatoMoneda(c.pagoMensual)}</td>
                  <td>Día {c.diaPago}</td>
                  <td>
                    <span className={`pill ${pagado ? 'paid' : 'pending'}`}>
                      {pagado ? 'Pagado' : 'Pendiente'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => editar(c)}>Editar</button>
                      <button className="btn btn-red btn-sm" onClick={() => borrar(c)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan="7" className="muted">No hay clientes que coincidan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
