import { useState, useEffect } from 'react';
import {
  store,
  guardarEstacion,
  eliminarEstacion,
  embedMapsUrl,
} from '../store.js';

const VACIO = { nombre: '', ubicacion: '', mapsLink: '' };

export default function Estaciones() {
  const [, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), []);
  const { estaciones, clientes } = store.getState();
  const [form, setForm] = useState(VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [msg, setMsg] = useState('');

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function guardar(e) {
    e.preventDefault();
    await guardarEstacion({ ...form }, editandoId);
    setMsg(editandoId ? 'Estación actualizada.' : 'Estación registrada.');
    setForm(VACIO);
    setEditandoId(null);
  }

  function editar(est) {
    setForm({ nombre: est.nombre, ubicacion: est.ubicacion, mapsLink: est.mapsLink || '' });
    setEditandoId(est.id);
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function borrar(est) {
    if (!window.confirm(`¿Eliminar la estación ${est.nombre}?`)) return;
    const r = await eliminarEstacion(est.id);
    setMsg(r.ok ? 'Estación eliminada.' : r.error);
  }

  return (
    <div>
      <div className="form-card">
        <h2 style={{ marginTop: 0 }}>{editandoId ? 'Editar estación' : 'Registrar estación'}</h2>
        <form onSubmit={guardar}>
          <div className="form-grid">
            <div>
              <label>Nombre de la estación *</label>
              <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required placeholder="Estación Centro" />
            </div>
            <div>
              <label>Ubicación de la estación *</label>
              <input value={form.ubicacion} onChange={(e) => set('ubicacion', e.target.value)} required placeholder="Colonia, referencias" />
            </div>
            <div>
              <label>Link de Google Maps</label>
              <input value={form.mapsLink} onChange={(e) => set('mapsLink', e.target.value)} placeholder="https://www.google.com/maps/search/?api=1&query=..." />
            </div>
          </div>
          <p className="muted" style={{ fontSize: '.88rem' }}>
            Para sacar el link: abre Google Maps, busca el lugar, toca
            “Compartir” y copia el enlace. Si el enlace trae la búsqueda, la
            página también muestra el mapa incrustado.
          </p>
          <div className="form-actions">
            <button className="btn" type="submit">{editandoId ? 'Guardar cambios' : 'Registrar estación'}</button>
            {editandoId && (
              <button type="button" className="btn btn-ghost" onClick={() => { setForm(VACIO); setEditandoId(null); }}>
                Cancelar edición
              </button>
            )}
            {msg && <span className="muted">{msg}</span>}
          </div>
        </form>
      </div>

      <div className="station-cards">
        {estaciones.map((e) => {
          const nClientes = clientes.filter((c) => c.estacionId === e.id).length;
          const embed = embedMapsUrl(e.mapsLink);
          return (
            <div className="card" key={e.id}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text)' }}>{e.nombre}</h3>
              <div>{e.ubicacion}</div>
              <div className="muted" style={{ marginTop: 4 }}>
                {nClientes} cliente{nClientes === 1 ? '' : 's'}
              </div>
              {e.mapsLink && (
                <div style={{ marginTop: 10 }}>
                  <a href={e.mapsLink} target="_blank" rel="noreferrer" className="btn btn-sm">
                    📍 Ver en Maps
                  </a>
                </div>
              )}
              {embed && (
                <iframe title={`Mapa de ${e.nombre}`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              )}
              <div className="row-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => editar(e)}>Editar</button>
                <button className="btn btn-red btn-sm" onClick={() => borrar(e)}>Eliminar</button>
              </div>
            </div>
          );
        })}
        {estaciones.length === 0 && (
          <p className="muted">Aún no hay estaciones. Registra la primera arriba.</p>
        )}
      </div>
    </div>
  );
}
