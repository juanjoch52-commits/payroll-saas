# MyJova — App móvil (Expo / React Native)

App para empleados: fichar entrada/salida (con selfie + GPS), ver horas y recibos
de pago (paystubs) con descarga en PDF, y recibir notificaciones push. Usa el
**mismo proyecto Supabase** que la web y la API REST `/api/v1` del backend MyJova.

## Requisitos
- Node 18+, y la app **MyJova web desplegada** (o corriendo en tu LAN) para la API.
- Cuenta [Expo](https://expo.dev) (gratis) para builds y push.

## Setup
```bash
cd apps/mobile
npm install
npx expo install --fix      # alinea versiones nativas al SDK
cp .env.example .env         # rellena EXPO_PUBLIC_SUPABASE_URL / ANON_KEY / API_URL
```

`.env`:
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`: del mismo proyecto Supabase que la web.
- `EXPO_PUBLIC_API_URL`: URL del backend MyJova. En dev local usa `http://TU_IP_LAN:3000` (no `localhost`, el teléfono no lo resuelve).

## Correr en desarrollo
```bash
npx expo start
```
Escanea el QR con **Expo Go** (Android) o la cámara (iOS). La cámara, ubicación y
push funcionan mejor en un **development build** (`eas build --profile development`)
o en un dispositivo físico.

## Estructura
```
app/
  _layout.tsx          Auth gate (redirige a login si no hay sesión)
  (auth)/login.tsx     Inicio de sesión (Supabase email+password)
  (tabs)/
    index.tsx          Fichar (cámara selfie + GPS → /api/v1/time/clock-in|out)
    history.tsx        Turnos recientes (/api/v1/time/entries)
    paystubs.tsx       Lista de recibos (/api/v1/paystubs)
    profile.tsx        Perfil + cerrar sesión
  paystub/[id].tsx     Detalle de recibo + descarga PDF (/api/v1/paystubs/:id/pdf)
lib/
  supabase.ts          Cliente Supabase (AsyncStorage)
  api.ts               Helpers REST (Bearer = JWT de Supabase)
  auth.tsx             Contexto de sesión
  i18n.ts              Traducciones ES/EN/FR
  push.ts              Registro de Expo push token
```

## Build para tiendas
```bash
npm install -g eas-cli
eas login
eas build --profile production --platform ios      # o android
eas submit --platform ios                           # subir a App Store / Play
```
Configura `ios.bundleIdentifier` / `android.package` en `app.json` (ya van como
`com.myjova.app`) y los íconos/splash en `app.json` antes del build de producción.

## Notas
- La RLS por empleado (web) aplica igual: cada empleado solo ve sus datos.
- Las escrituras (clock in/out) pasan por la API REST porque reutilizan la lógica
  de geofence + foto + estados del backend; las lecturas también van por REST.
- Push: el dispatcher del backend envía al canal `push` por web-push **y** Expo.
