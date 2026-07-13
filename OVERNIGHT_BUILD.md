# MyJova — Build nocturno (kiosko, producción, QuickBooks, app móvil)

Resumen de lo que se construyó esta noche y **la lista de lo que necesitas
configurar tú**. Todo el código está listo, compila en verde (typecheck + lint +
build + tests) y está commiteado en la rama `feature/myjova-full-rebuild`.

## Qué se añadió (13 fases, G0–G12)

1. **Pago por producción / a destajo** — nuevo esquema `piecerate` (pago por
   unidad) con suelo de salario mínimo (FLSA). Pantalla de registro de producción
   para managers (`/production`). Entra solo en la nómina automáticamente.
2. **Industria por empresa** — al registrarte eliges industria (construcción,
   restaurante, retail, limpieza, manufactura…). Conduce sugerencias de setup
   (kiosko, worksites, geofence, propinas, producción) en Ajustes → General.
3. **Kiosko de tablet para restaurantes** — una tablet fija deja fichar a varios
   empleados con **rejilla de nombres + PIN de 4 dígitos + selfie**, sin que cada
   uno inicie sesión. Ruta `/kiosk`. Anti-fraude: lockout tras 5 intentos, foto en
   cada fichaje, aislamiento por tenant.
4. **Recibos de pago (paystubs) con detalle + PDF** — los empleados ven el
   desglose línea por línea y descargan el PDF (en su idioma). Se reforzó la
   seguridad: un empleado ya **no** puede ver la nómina de sus colegas.
5. **QuickBooks Online** — conexión OAuth2 completa, envío de la nómina como
   asientos de diario (journal entries), sincronización de empleados, y **export
   IIF/CSV** que funciona sin llaves. En Ajustes → Integraciones.
6. **App móvil (Expo / React Native)** — app para empleados: fichar con cámara +
   GPS, ver horas, ver y descargar recibos, notificaciones push. En `apps/mobile`.

Multi-idioma ES/EN/FR/fr-CA en todo lo nuevo. Multi-tenant respetado.

---

## ✅ Lista de lo que necesitas hacer

### 1. Aplicar las migraciones nuevas (REQUERIDO)
Hay **8 migraciones nuevas** (`supabase/migrations/20260401*`). Tras conectar
Supabase (ver `MANUAL_STEPS.md`):
```bash
npm run db:push
npm run db:types   # regenera tipos estrictos (opcional pero recomendado)
```
Crean: `industry_type`, `production_entries`, `kiosk_devices`, `employee_pins`,
`kiosk_pin_attempts`, `expo_push_tokens`, columnas piece-rate, y endurecen la RLS
de paystubs.

### 2. `ENCRYPTION_KEY` (REQUERIDO para QuickBooks)
Cifra los tokens de QuickBooks en la base de datos. Genera una y ponla en
`.env.local` (y en Vercel):
```bash
openssl rand -base64 32
```
→ `ENCRYPTION_KEY=...`  (sin esto, QuickBooks queda deshabilitado pero el export
IIF/CSV sigue funcionando).

### 3. QuickBooks Online (OPCIONAL — el export funciona sin esto)
Para la sincronización en vivo:
1. Crea una app en https://developer.intuit.com/app/developer/dashboard
2. Copia a `.env.local`:
   - `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`
   - `QUICKBOOKS_ENVIRONMENT=sandbox` (luego `production`)
   - `QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN` (opcional, para webhooks)
3. Registra el **Redirect URI**: `<TU_URL>/api/integrations/quickbooks/callback`
4. En la app: Ajustes → Integraciones → Conectar QuickBooks, y mapea tus cuentas
   (gasto de sueldos, caja, pasivos de impuestos) pegando los IDs de cuenta de QBO.

### 4. App móvil — Expo / EAS (OPCIONAL)
```bash
cd apps/mobile
npm install
npx expo install --fix
cp .env.example .env     # Supabase (mismo proyecto) + EXPO_PUBLIC_API_URL
npx expo start           # probar en Expo Go o development build
```
Para publicar en tiendas: cuenta Expo + `eas build` + `eas submit` (ver
`apps/mobile/README.md`). Push de producción usa APNs/FCM vía EAS.

### 5. Configurar kiosko y PINs (cuando uses restaurantes)
1. Crea un **worksite** (la ubicación del restaurante) en `/worksites`.
2. Ajustes → **Dispositivos**: "Emparejar una tablet" → genera un código.
3. En la tablet abre `<TU_URL>/kiosk` e ingresa el código (queda emparejada).
4. En la misma página, pon un **PIN de 4 dígitos** a cada empleado.

### 6. Pendiente de antes (ver `MANUAL_STEPS.md`)
Supabase, Mapbox, Stripe, Resend (y opcional Twilio/VAPID) siguen pendientes de
configurar como ya estaba documentado. La app funciona en dev sin ninguna key
(modo stub/placeholder), incluido todo lo nuevo.

---

## Cómo probar lo nuevo (sin tiendas ni QuickBooks reales)
- **Producción**: crea un empleado con esquema "Por producción" → `/production`
  registra cantidades → entra en la nómina al calcular una run.
- **Kiosko**: empareja una tablet (o tu navegador) en `/kiosk`, pon un PIN a un
  empleado, ficha con nombre+PIN+selfie.
- **Paystub PDF**: como empleado, abre un recibo y descarga el PDF.
- **QuickBooks (stub)**: Ajustes → Integraciones → "Sync" en una nómina devuelve
  un asiento simulado; "IIF"/"CSV" descargan archivos reales importables.
- **App móvil**: `npx expo start`, inicia sesión con un empleado, ficha.

## Variables de entorno nuevas (en `.env.example`)
`ENCRYPTION_KEY`, `QUICKBOOKS_CLIENT_ID/SECRET/ENVIRONMENT`,
`QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN`, `EXPO_ACCESS_TOKEN`.
