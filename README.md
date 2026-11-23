# 📶 Control de Clientes de Internet

Aplicación web en **React + Vite** para administrar los clientes y pagos de
un servicio de internet por estaciones. Responsive (celular, tablet y
computadora), con login por roles, dashboard, registro de clientes,
estaciones con Google Maps, registro de pagos, lista de morosos con
recordatorio por WhatsApp, reportes por estación y por mes, y guardado en
**Firebase Firestore (con modo offline)** o en modo demo sin Firebase.

## Qué hace cada sección

| Sección | Quién la ve | Qué hace |
|---|---|---|
| **Dashboard** | Admin | Clientes totales por estación, dinero esperado y cobrado por estación este mes, dinero total registrado por cada administrador (mes actual e histórico), totales globales y últimos pagos. |
| **Clientes** | Admin | Alta, edición y baja de clientes: nombre, ubicación, teléfono, IP, pago mensual (MXN), estación y día de pago (1–31). Buscador y filtro por estación, con estado pagado/pendiente del mes. |
| **Estaciones** | Admin | Alta, edición y baja de estaciones: nombre, ubicación y link de Google Maps. Tarjetas con botón “Ver en Maps” y mapa incrustado cuando el link lo permite. |
| **Pagos** | Admin | Registra un pago eligiendo estación → cliente (filtrado), mes, monto (por defecto la mensualidad del cliente), método (efectivo / transferencia / otro) y fecha. El pago queda registrado a nombre del admin que inició sesión y marca al cliente como pagado ese mes. Lista de pagos recientes con opción de eliminar. |
| **Morosos** | Admin | Clientes sin pago en el mes actual, con estación, teléfono, monto, día de vencimiento y estado (vencido / próximo a vencer / pendiente). Botón de WhatsApp por cliente que abre el chat con el recordatorio ya escrito en español. |
| **Reportes** | Admin | Por estación (clientes, esperado, cobrado, pendiente) y por mes, con totales por administrador en el mes. Selector de mes y botón de imprimir / guardar PDF. |
| **Mi pago** | Usuario (cliente) | Solo ve su propio pago del mes actual (monto, vencimiento, pagado o pendiente) y su historial de pagos. No ve a otros clientes ni las secciones de admin. |

## Cuentas demo (sin Firebase)

La app arranca en **Modo demo (sin Firebase)**: los datos de ejemplo viven
en el navegador (localStorage) y las cuentas demo funcionan sin internet.


Datos de ejemplo: 3 estaciones (Centro, Norte y Sur, en Puebla), 12 clientes
con teléfonos mexicanos de 10 dígitos e IPs 192.168.x.x, mensualidades de
$250–$450 MXN. En noviembre 2026 pagaron 6 de 12 clientes ($1,850 de $3,950
esperados); en octubre 2026 pagaron 10 de 12.

## Cómo correrla en local

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm run build      # compila a dist/
npm run preview    # sirve la versión compilada
```

## Publicar en GitHub Pages

El workflow de GitHub Actions publica automáticamente la app cuando haces
push a `main`. Antes de publicar:

1. En GitHub, abre **Settings → Secrets and variables → Actions** y crea
   estos seis secretos usando los valores de la configuración de tu app web
   de Firebase:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID` y `VITE_FIREBASE_APP_ID`.
2. En **Settings → Pages**, selecciona **GitHub Actions** como fuente.
3. En **Actions**, ejecuta el workflow **Deploy to GitHub Pages** o haz
   push a `main`. Al terminar, la URL de la app aparece en el deployment
   `github-pages`.

El workflow compila con esos secretos y falla si falta alguno. No subas el
archivo `.env`: para desarrollo local puedes copiar `.env.example` a `.env`.
Los valores de configuración Firebase que empiezan con `VITE_` se incluyen
en el JavaScript publicado y son visibles en el navegador; protege los datos
con las reglas de seguridad de Firestore y las restricciones adecuadas de la
API key.

## Conectar Firebase real (paso a paso)

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
   y crea un proyecto (puede ser en el plan Spark, gratuito).
2. **Firestore Database** → Crear base de datos → modo **producción** →
   elige la región (por ejemplo `us-central1`).
3. **Authentication** → Método de inicio de sesión → habilita
   **Correo electrónico/contraseña**.
4. En Authentication → Usuarios → Agregar usuario: crea las cuentas de
   los administradores y de cada cliente con su correo y contraseña.
5. En Firestore crea la colección **`usuarios`** con un documento por
   persona, con estos campos:
   - `email`: el mismo correo de Auth (texto)
   - `nombre`: nombre para mostrar (texto)
   - `rol`: `admin` o `usuario` (texto)
   - `clienteId`: solo para clientes — el ID del documento del cliente
     en la colección `clientes` (texto)
6. En **Configuración del proyecto → Tus apps → Web** copia los datos de
   configuración y crea un archivo `.env` en la raíz del proyecto (puedes
   copiar `.env.example` como guía):
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
7. Vuelve a correr `npm run dev`. La barra superior debe decir
   **“Firebase conectado”** en lugar de “Modo demo (sin Firebase)”.
8. Las colecciones `estaciones`, `clientes` y `pagos` se crean solas al
   guardar el primer dato desde la app.

> Sin el archivo `.env` la app funciona igual en modo demo; con el `.env`
> las cuentas demo dejan de funcionar y se usa Firebase Auth.

### Reglas de seguridad de Firestore (ejemplo)

En Firestore → Reglas, pega algo como esto y ajústalo a tu caso. La idea:
solo usuarios autenticados leen/escriben, y el perfil de cliente solo ve
sus propios datos (el front ya limita lo que muestra, pero la regla es la
que realmente protege los datos):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function esAdmin() {
      return request.auth != null
        && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'admin';
    }
    match /usuarios/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || esAdmin());
      allow write: if esAdmin();
    }
    match /estaciones/{id} {
      allow read: if request.auth != null;
      allow write: if esAdmin();
    }
    match /clientes/{id} {
      allow read: if request.auth != null
        && (esAdmin() || resource.data.id == get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.clienteId);
      allow write: if esAdmin();
    }
    match /pagos/{id} {
      allow read: if request.auth != null
        && (esAdmin() || resource.data.clienteId == get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.clienteId);
      allow write: if esAdmin();
    }
  }
}
```

> Nota: para que `get(.../usuarios/$(request.auth.uid))` funcione, el
> documento de cada usuario en `usuarios` debe tener como **ID el UID de
> Firebase Auth** (no un ID automático). Al crear el usuario en Auth,
> copia su UID y úsalo como ID del documento en `usuarios`.

## Cómo funciona el modo offline y la sincronización

- **Con Firebase:** Firestore se inicializa con caché persistente
  (`persistentLocalCache` + `persistentSingleTabManager`, la API actual
  de Firebase v13). Los datos quedan guardados en IndexedDB del
  navegador: la app abre y se usa sin internet, y cuando vuelve la
  conexión Firestore sube los cambios y baja los de otros dispositivos
  automáticamente. La barra superior muestra **“En línea” / “Sin
  conexión”** y el contador **“Cambios pendientes por sincronizar”**,
  que se pone en cero cuando Firestore confirma los escritos.
- **En modo demo:** los datos viven en `localStorage`. Si te quedas sin
  conexión, los cambios que hagas se cuentan como pendientes; al volver
  la conexión el contador se limpia (en demo no hay servidor al que
  subirlos: la “sincronización” es local y sirve para ver el flujo).
- **Teléfonos y WhatsApp:** los teléfonos se guardan como 10 dígitos.
  Para el link de WhatsApp se normaliza a `52` + 10 dígitos
  (prefijo de México). Si un cliente tiene otro formato, revisa el
  número antes de enviar el mensaje.

## Estructura del proyecto

```
src/
  firebase.js      Config de Firebase (lee .env) + caché offline
  store.js         Capa de datos: demo (localStorage) o Firebase,
                   login por rol, CRUD y consultas (morosos, pagos del mes…)
  App.jsx          Login, menú lateral, barra superior (en línea / pendientes)
  components/
    Login.jsx      Inicio de sesión + cuentas demo
    Dashboard.jsx  Totales por estación y por administrador
    Clientes.jsx   CRUD de clientes + buscador
    Estaciones.jsx CRUD de estaciones + Google Maps
    Pagos.jsx      Registro de pagos + historial
    Morosos.jsx    Sin pagar este mes + botón de WhatsApp
    Reportes.jsx   Por estación y por mes + imprimir
    MiPago.jsx     Vista del cliente: su pago del mes e historial
  styles.css       Estilos responsive (barra lateral → menú superior en móvil)
```

## Notas

- El envío real de Firebase no se probó aquí porque requiere el proyecto
  de Firebase de Johnny; el modo demo se probó completo (login de los 3
  roles, registro y duplicado de pagos, morosos, totales y link de
  WhatsApp).
- Los mapas incrustados dependen del link de Google Maps que se capture:
  con el link de “Compartir” de Google Maps se ve el mapa; con un link
  acortado (`maps.app.goo.gl`) solo aparece el botón “Ver en Maps”.
