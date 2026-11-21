// Capa de datos: la UI no sabe si los datos viven en Firebase
// (Firestore + Auth) o en modo demo (localStorage). Toda la app usa
// este store: estado en memoria + suscripción para re-renderizar.
//
// Colecciones Firestore: estaciones, clientes, pagos, usuarios.
// Modo demo: todo en localStorage bajo la clave DEMO_KEY.
import { firebaseConfigured, db, auth } from './firebase.js';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  onSnapshotsInSync,
  query,
  where,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';

// ---------------------------------------------------------------- cuentas demo
export const DEMO_ACCOUNTS = [
  {
    email: 'admin@controlinternet.local',
    password: 'Admin123!',
    nombre: 'Administrador General',
    rol: 'admin',
    clienteId: null,
  },
  {
    email: 'cobros@controlinternet.local',
    password: 'Cobros123!',
    nombre: 'Admin de Cobros',
    rol: 'admin',
    clienteId: null,
  },
  {
    email: 'cliente@controlinternet.local',
    password: 'Cliente123!',
    nombre: 'María López',
    rol: 'usuario',
    clienteId: 'c1',
  },
];

// ------------------------------------------------------------------ utilidades
export const mesKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const mesActual = () => mesKey(new Date());
export const mesAnterior = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return mesKey(d);
};
export const nombreMes = (mes) => {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });
};
export const formatoMoneda = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

// Teléfono mexicano: 10 dígitos -> 52 + número (para wa.me).
export const normalizarTelefonoWA = (tel) => {
  const digitos = String(tel || '').replace(/\D/g, '');
  if (digitos.length === 10) return '52' + digitos;
  if (digitos.length === 12 && digitos.startsWith('52')) return digitos;
  if (digitos.length === 11 && digitos.startsWith('1')) return '52' + digitos.slice(1);
  return digitos;
};

export const mensajeWhatsApp = (cliente, estacion, mes) => {
  const texto =
    `Hola ${cliente.nombre}, te recordamos que tu pago de internet de ${estacion?.nombre || 'tu estación'} ` +
    `por ${formatoMoneda(cliente.pagoMensual)} vence el día ${cliente.diaPago} de ${nombreMes(mes)}. ` +
    `Puedes pagar en efectivo o por transferencia. ¡Gracias por tu pago puntual!`;
  return `https://wa.me/${normalizarTelefonoWA(cliente.telefono)}?text=${encodeURIComponent(texto)}`;
};

// Link de Google Maps -> URL para incrustar (iframe). Si no se puede
// extraer la búsqueda, devuelve null y solo se muestra el botón.
export const embedMapsUrl = (link) => {
  if (!link) return null;
  try {
    const u = new URL(link);
    const q = u.searchParams.get('query') || u.searchParams.get('q');
    if (q) return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    if (u.hostname.includes('google.com') || u.hostname.includes('maps.app.goo.gl')) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(link)}&output=embed`;
    }
    return null;
  } catch {
    return null;
  }
};

// ------------------------------------------------------------------- seed demo
const DEMO_KEY = 'cci_demo_v1';

function semilla() {
  const estaciones = [
    {
      id: 'e1',
      nombre: 'Estación Centro',
      ubicacion: 'Centro, Puebla, Pue.',
      mapsLink: 'https://www.google.com/maps/search/?api=1&query=Z%C3%B3calo+de+Puebla',
    },
    {
      id: 'e2',
      nombre: 'Estación Norte',
      ubicacion: 'Colonia Norte, Puebla, Pue.',
      mapsLink: 'https://www.google.com/maps/search/?api=1&query=Parque+de+San+Antonio+Puebla',
    },
    {
      id: 'e3',
      nombre: 'Estación Sur',
      ubicacion: 'Colonia Sur, Puebla, Pue.',
      mapsLink: 'https://www.google.com/maps/search/?api=1&query=Parque+Ecol%C3%B3gico+Puebla',
    },
  ];
  const clientes = [
    { id: 'c1', nombre: 'María López', ubicacion: 'Calle 5 de Mayo 123, Centro', telefono: '2221234567', ip: '192.168.1.10', pagoMensual: 300, estacionId: 'e1', diaPago: 5 },
    { id: 'c2', nombre: 'Juan Pérez', ubicacion: 'Av. Reforma 45, Centro', telefono: '2222345678', ip: '192.168.1.11', pagoMensual: 350, estacionId: 'e1', diaPago: 10 },
    { id: 'c3', nombre: 'Ana García', ubicacion: 'Calle Juárez 210, Centro', telefono: '2223456789', ip: '192.168.1.12', pagoMensual: 250, estacionId: 'e1', diaPago: 1 },
    { id: 'c4', nombre: 'Carlos Ruiz', ubicacion: 'Calle Morelos 8, Centro', telefono: '2224567890', ip: '192.168.1.13', pagoMensual: 400, estacionId: 'e1', diaPago: 15 },
    { id: 'c5', nombre: 'Lucía Hernández', ubicacion: 'Calle Hidalgo 321, Norte', telefono: '2225678901', ip: '192.168.2.10', pagoMensual: 300, estacionId: 'e2', diaPago: 3 },
    { id: 'c6', nombre: 'Pedro Sánchez', ubicacion: 'Av. Las Torres 77, Norte', telefono: '2226789012', ip: '192.168.2.11', pagoMensual: 450, estacionId: 'e2', diaPago: 8 },
    { id: 'c7', nombre: 'Sofía Ramírez', ubicacion: 'Calle Robles 56, Norte', telefono: '2227890123', ip: '192.168.2.12', pagoMensual: 350, estacionId: 'e2', diaPago: 12 },
    { id: 'c8', nombre: 'Miguel Torres', ubicacion: 'Calle Pinos 90, Norte', telefono: '2228901234', ip: '192.168.2.13', pagoMensual: 250, estacionId: 'e2', diaPago: 20 },
    { id: 'c9', nombre: 'Elena Morales', ubicacion: 'Calle Flores 14, Sur', telefono: '2229012345', ip: '192.168.3.10', pagoMensual: 300, estacionId: 'e3', diaPago: 2 },
    { id: 'c10', nombre: 'Jorge Castillo', ubicacion: 'Av. del Sur 200, Sur', telefono: '2220123456', ip: '192.168.3.11', pagoMensual: 400, estacionId: 'e3', diaPago: 7 },
    { id: 'c11', nombre: 'Carmen Vega', ubicacion: 'Calle Olivos 33, Sur', telefono: '2221123456', ip: '192.168.3.12', pagoMensual: 350, estacionId: 'e3', diaPago: 18 },
    { id: 'c12', nombre: 'Diego Fuentes', ubicacion: 'Calle Naranjos 61, Sur', telefono: '2222123456', ip: '192.168.3.13', pagoMensual: 250, estacionId: 'e3', diaPago: 25 },
  ];
  const ADMIN = 'admin@controlinternet.local';
  const COBROS = 'cobros@controlinternet.local';
  const pagos = [];
  let n = 1;
  // Octubre 2026: casi todos pagaron (faltan c4 y c10).
  clientes
    .filter((c) => !['c4', 'c10'].includes(c.id))
    .forEach((c, i) => {
      pagos.push({
        id: `p${n++}`,
        clienteId: c.id,
        clienteNombre: c.nombre,
        estacionId: c.estacionId,
        mes: '2026-10',
        monto: c.pagoMensual,
        metodo: i % 2 === 0 ? 'efectivo' : 'transferencia',
        fecha: `2026-10-${String(Math.min(c.diaPago, 28)).padStart(2, '0')}`,
        registradoPor: i % 2 === 0 ? ADMIN : COBROS,
      });
    });
  // Noviembre 2026: pagaron la mitad (c1, c3, c5, c7, c9, c11).
  ['c1', 'c3', 'c5', 'c7', 'c9', 'c11'].forEach((id, i) => {
    const c = clientes.find((x) => x.id === id);
    pagos.push({
      id: `p${n++}`,
      clienteId: c.id,
      clienteNombre: c.nombre,
      estacionId: c.estacionId,
      mes: '2026-11',
      monto: c.pagoMensual,
      metodo: i % 2 === 0 ? 'transferencia' : 'efectivo',
      fecha: `2026-11-${String(Math.min(c.diaPago + 1, 11)).padStart(2, '0')}`,
      registradoPor: i % 2 === 0 ? ADMIN : COBROS,
    });
  });
  return { estaciones, clientes, pagos };
}

// ----------------------------------------------------------------------- store
const listeners = new Set();
let state = {
  estaciones: [],
  clientes: [],
  pagos: [],
  loaded: false,
  user: null,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pending: 0,
  mode: firebaseConfigured ? 'firebase' : 'demo',
};
let initialized = false;
let unsubscribes = [];
let authGeneration = 0;
let listeningUid = null;

function detenerEscuchasFirestore() {
  unsubscribes.forEach((unsubscribe) => unsubscribe());
  unsubscribes = [];
  listeningUid = null;
}

function iniciarEscuchasFirestore(uid) {
  if (listeningUid === uid) return;
  detenerEscuchasFirestore();
  listeningUid = uid;

  const escucha = (nombre, clave) =>
    onSnapshot(
      collection(db, nombre),
      (snap) => {
        setState({ [clave]: snap.docs.map((x) => ({ id: x.id, ...x.data() })) });
      },
      (error) => {
        console.error(`No se pudo leer "${nombre}" en Firestore:`, error);
      },
    );
  unsubscribes.push(escucha('estaciones', 'estaciones'));
  unsubscribes.push(escucha('clientes', 'clientes'));
  unsubscribes.push(escucha('pagos', 'pagos'));
  unsubscribes.push(
    onSnapshotsInSync(db, () => {
      if (state.pending > 0) setState({ pending: 0 });
    }),
  );
}

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

export const store = {
  getState: () => state,
  subscribe: (fn) => {
    listeners.add(fn);
    fn(state);
    return () => listeners.delete(fn);
  },
};

// ------------------------------ persistencia demo (localStorage)
function guardarDemo() {
  try {
    localStorage.setItem(
      DEMO_KEY,
      JSON.stringify({
        estaciones: state.estaciones,
        clientes: state.clientes,
        pagos: state.pagos,
      }),
    );
  } catch {
    /* almacenamiento lleno o bloqueado: los datos quedan en memoria */
  }
}
function cargarDemo() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.clientes)) return d;
    }
  } catch {
    /* datos corruptos: se resiembra */
  }
  const s = semilla();
  localStorage.setItem(DEMO_KEY, JSON.stringify(s));
  return s;
}
const nuevoId = (prefijo) => `${prefijo}_${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`;

// Registrar un cambio local: en demo sin conexión se encola como
// pendiente; con Firebase se descuenta cuando Firestore confirma.
function cambioLocal() {
  if (state.mode === 'demo') {
    if (!state.online) setState({ pending: state.pending + 1 });
  } else {
    setState({ pending: state.pending + 1 });
  }
}

// ------------------------------------------------------------- inicialización
export async function initStore() {
  if (initialized) return;
  initialized = true;

  const onOnline = () => {
    setState({ online: true });
    // Al volver la conexión, lo pendiente se sincroniza: en demo la
    // cola solo era local (ya guardada en localStorage); en Firebase
    // lo hace Firestore solo.
    if (state.mode === 'demo' && state.pending > 0) {
      setState({ pending: 0 });
    }
  };
  const onOffline = () => setState({ online: false });
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  if (!firebaseConfigured) {
    const d = cargarDemo();
    setState({ estaciones: d.estaciones, clientes: d.clientes, pagos: d.pagos, loaded: true });
    return;
  }

  // No esperes los datos remotos para desbloquear la interfaz. Las
  // reglas de Firestore pueden rechazar una consulta y, si esto no se
  // marca, App queda permanentemente mostrando "Cargando".
  setState({ loaded: true });

  // Espera a que Auth restaure o inicie sesión antes de leer colecciones
  // cuyas reglas requieren request.auth.
  onAuthStateChanged(auth, async (fbUser) => {
    const generation = ++authGeneration;
    if (fbUser) {
      const perfil = await perfilUsuario(fbUser.email);
      if (generation !== authGeneration) return;
      if (perfil) {
        setState({ user: perfil });
        iniciarEscuchasFirestore(fbUser.uid);
      } else {
        detenerEscuchasFirestore();
        setState({ user: null, estaciones: [], clientes: [], pagos: [] });
      }
    } else {
      detenerEscuchasFirestore();
      setState({ user: null, estaciones: [], clientes: [], pagos: [] });
    }
  });
}

async function perfilUsuario(email) {
  try {
    const q = query(collection(db, 'usuarios'), where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0].data();
    return {
      email,
      nombre: d.nombre || email,
      rol: d.rol || 'usuario',
      clienteId: d.clienteId || null,
      origen: 'firebase',
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------------ auth
export async function login(email, password) {
  const e = String(email || '').trim().toLowerCase();
  if (!firebaseConfigured) {
    const cuenta = DEMO_ACCOUNTS.find(
      (a) => a.email === e && a.password === password,
    );
    if (!cuenta) return { ok: false, error: 'Correo o contraseña incorrectos.' };
    const user = {
      email: cuenta.email,
      nombre: cuenta.nombre,
      rol: cuenta.rol,
      clienteId: cuenta.clienteId,
      origen: 'demo',
    };
    setState({ user });
    return { ok: true, user };
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, e, password);
    const perfil = await perfilUsuario(cred.user.email);
    if (!perfil) {
      await fbSignOut(auth);
      return {
        ok: false,
        error: 'Tu cuenta existe en Auth pero no tiene perfil en la colección "usuarios". Pídele al admin que te registre.',
      };
    }
    setState({ user: perfil });
    return { ok: true, user: perfil };
  } catch (err) {
    const code = err?.code || '';
    if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential'))
      return { ok: false, error: 'Correo o contraseña incorrectos.' };
    return { ok: false, error: 'No se pudo iniciar sesión. Revisa tu conexión.' };
  }
}

export async function logout() {
  if (firebaseConfigured) {
    try {
      await fbSignOut(auth);
    } catch {
      /* sesión ya cerrada */
    }
    detenerEscuchasFirestore();
  }
  setState({ user: null });
}

// ------------------------------------------------------------------ consultas
export const pagosDelMes = (mes) => state.pagos.filter((p) => p.mes === mes);
export const clientePagado = (clienteId, mes) =>
  state.pagos.some((p) => p.clienteId === clienteId && p.mes === mes);
export const pagoDeCliente = (clienteId, mes) =>
  state.pagos.find((p) => p.clienteId === clienteId && p.mes === mes);
export const morososDelMes = (mes) =>
  state.clientes.filter((c) => !clientePagado(c.id, mes));
export const estacionPorId = (id) => state.estaciones.find((e) => e.id === id);
export const clientePorId = (id) => state.clientes.find((c) => c.id === id);

// ------------------------------------------------------------------------ CRUD
async function escribirDemo() {
  guardarDemo();
}

export async function guardarEstacion(datos, id) {
  cambioLocal();
  if (state.mode === 'demo') {
    if (id) {
      setState({
        estaciones: state.estaciones.map((e) => (e.id === id ? { ...e, ...datos } : e)),
      });
    } else {
      setState({ estaciones: [...state.estaciones, { id: nuevoId('e'), ...datos }] });
    }
    escribirDemo();
    return;
  }
  if (id) await updateDoc(doc(db, 'estaciones', id), datos);
  else await addDoc(collection(db, 'estaciones'), datos);
}

export async function eliminarEstacion(id) {
  if (state.clientes.some((c) => c.estacionId === id)) {
    return { ok: false, error: 'No se puede eliminar: hay clientes en esta estación.' };
  }
  cambioLocal();
  if (state.mode === 'demo') {
    setState({ estaciones: state.estaciones.filter((e) => e.id !== id) });
    escribirDemo();
    return { ok: true };
  }
  await deleteDoc(doc(db, 'estaciones', id));
  return { ok: true };
}

export async function guardarCliente(datos, id) {
  cambioLocal();
  if (state.mode === 'demo') {
    if (id) {
      setState({
        clientes: state.clientes.map((c) => (c.id === id ? { ...c, ...datos } : c)),
      });
    } else {
      setState({ clientes: [...state.clientes, { id: nuevoId('c'), ...datos }] });
    }
    escribirDemo();
    return;
  }
  if (id) await updateDoc(doc(db, 'clientes', id), datos);
  else await addDoc(collection(db, 'clientes'), datos);
}

export async function eliminarCliente(id) {
  cambioLocal();
  if (state.mode === 'demo') {
    setState({ clientes: state.clientes.filter((c) => c.id !== id) });
    escribirDemo();
    return;
  }
  await deleteDoc(doc(db, 'clientes', id));
}

export async function registrarPago({ clienteId, mes, monto, metodo, fecha }) {
  const cliente = clientePorId(clienteId);
  if (!cliente) return { ok: false, error: 'Cliente no encontrado.' };
  if (clientePagado(clienteId, mes)) {
    return { ok: false, error: 'Ese cliente ya tiene pago registrado en ese mes.' };
  }
  const pago = {
    clienteId,
    clienteNombre: cliente.nombre,
    estacionId: cliente.estacionId,
    mes,
    monto: Number(monto),
    metodo,
    fecha,
    registradoPor: state.user ? state.user.email : 'sistema',
  };
  cambioLocal();
  if (state.mode === 'demo') {
    setState({ pagos: [...state.pagos, { id: nuevoId('p'), ...pago }] });
    escribirDemo();
    return { ok: true };
  }
  await addDoc(collection(db, 'pagos'), pago);
  return { ok: true };
}

export async function eliminarPago(id) {
  cambioLocal();
  if (state.mode === 'demo') {
    setState({ pagos: state.pagos.filter((p) => p.id !== id) });
    escribirDemo();
    return;
  }
  await deleteDoc(doc(db, 'pagos', id));
}
