# MyJova — Análisis competitivo: qué falta para estar completo

Revisión del código actual contra los competidores directos
(**Homebase, When I Work, Deputy, 7shifts, Connecteam** en tiempo+equipo;
**Gusto, Square Payroll, ADP, QuickBooks Payroll** en nómina).
Basado en el estado real del repo (rutas, tablas y librerías), no en memoria.

---

## Resumen ejecutivo

MyJova ya tiene una base **más completa que un MVP típico**: multi-tenant, 5 esquemas
de pago (incl. producción), fichaje con foto/GPS/geocerco, **kiosko de tablet** (un
diferenciador real), portal de empleado + **app móvil**, motor de nómina con impuestos
US (6 estados) + Canadá (4 provincias), formularios fiscales en PDF, QuickBooks, panel
super-admin, billing Stripe, notificaciones multicanal e i18n ES/EN/FR.

**Pero hay 5 vacíos que son "table stakes"** (lo mínimo que el mercado espera) y que hoy
impiden competir de frente:

1. **No hay programación de turnos (scheduling)** — es el corazón de Homebase/7shifts/When I Work.
2. **No hay vacaciones/PTO ni solicitudes de tiempo libre.**
3. **La nómina calcula pero no PAGA** (sin depósito directo/ACH) — es un "calculador", no un "proveedor de nómina".
4. **No hay auto-onboarding del empleado ni firma electrónica** (W-4, I-9, depósito directo).
5. **No hay gestión de propinas ni integración con POS** (clave para restaurantes).

Cerrando el **Tier 1** de abajo, MyJova pasa de "muy buen MVP" a "producto comercializable".

---

## ✅ Lo que YA tiene (para ser justos)

Multi-tenant + RLS · roles + invitaciones · auth · empleados + esquemas de pago
(hora/salario/día/comisión/producción) · fichaje (foto, GPS, geocerco, aprobación) ·
**kiosko PIN+selfie** · motor de nómina (federal+estatal US, federal+provincial CA) ·
runs (draft→calcular→aprobar→pagado) · PDFs W-2/1099/T4/T4A/ROE · calendario fiscal ·
recibos detalle+PDF · **app móvil Expo** · **QuickBooks** (OAuth + asientos + IIF/CSV) ·
panel super-admin (tenants, impersonation, auditoría, soporte, broadcasts, analytics) ·
billing Stripe + feature gating · notificaciones (in-app/email/SMS/push) · API REST + keys.

---

## 🔴 Tier 1 — Table stakes (sin esto no compite)

### 1. Programación de turnos (Scheduling) — *el vacío más grande*
**Falta:** crear horarios/rosters, plantillas y turnos recurrentes, publicar el horario,
turnos abiertos + auto-asignación, **intercambio de turnos**, alertas de no-show/tarde
vs lo programado, costo laboral proyectado vs presupuesto.
**Compite con:** Homebase, When I Work, Deputy, 7shifts, Connecteam (su producto ENTERO gira en esto).
**Por qué importa:** un restaurante/retail elige primero por el horario; el fichaje viene después.
**Esfuerzo:** Alto. Tablas `shifts`, `schedules`, `shift_swaps` + UI calendario + publicación + push.

### 2. Tiempo libre / PTO / vacaciones
**Falta:** políticas de acumulación (accrual), saldos por empleado, **flujo de solicitud → aprobación**,
licencia por enfermedad (obligatoria en muchos estados), saldo en el recibo, calendario "quién está fuera".
**Compite con:** todos. Hoy solo existe el estado `on_leave`, sin solicitudes ni saldos.
**Esfuerzo:** Medio. Tablas `pto_policies`, `pto_balances`, `time_off_requests` + UI.

### 3. Pago real (depósito directo / ACH)
**Falta:** captura de cuenta bancaria del empleado, rieles de pago (ACH), distribución del
neto, comprobante de pago. Hoy `markPayrollRunPaid` solo cambia un estado — **no mueve dinero**.
**Compite con:** Gusto, Square Payroll, ADP (estos SÍ pagan).
**Por qué importa:** es la diferencia entre "calculadora de nómina" y "nómina de verdad".
**Esfuerzo:** Alto + legal. Integrar un proveedor de pagos embebido (Check, Increase, Modern
Treasury, Stripe Treasury/Connect, o Gusto Embedded). Requiere KYC/compliance.

### 4. Auto-onboarding del empleado + documentos + firma electrónica
**Falta:** que el empleado complete **él mismo** W-4, I-9, depósito directo; almacén de
documentos (cartas de oferta, manuales, certificaciones); **e-signature**; seguimiento de I-9
y autorización de trabajo; onboarding de contratistas (W-9, entrega de 1099). El perfil hoy es
solo lectura ("contacta a tu manager").
**Compite con:** Gusto, ADP, Connecteam.
**Esfuerzo:** Medio. Bucket de documentos + flujo de onboarding + firma (e-sign propia o DocuSign/Dropbox Sign).

### 5. Propinas + integración con POS (vertical restaurante)
**Falta:** captura de propinas, **tip pooling / tip-out**, distribución por reglas, y traer
ventas+propinas desde el POS (**Toast, Square, Clover**). Hoy "propinas" es solo una sugerencia
del preset de industria, sin funcionalidad.
**Compite con:** 7shifts, Toast Payroll, Square.
**Esfuerzo:** Medio (propinas) + Alto (cada integración POS).

---

## 🟠 Tier 2 — Profundidad por vertical y diferenciadores

### 6. Nómina certificada (construcción) + job costing
Davis-Bacon **WH-347**, prevailing wage, costo por obra/proyecto. MyJova apunta a construcción
pero no lo tiene. Diferenciador fuerte vs genéricos. **Esfuerzo:** Medio.

### 7. Horas extra y descansos avanzados (compliance)
Hoy: OT semanal + multiplicador. **Falta:** OT diaria y doble-tiempo (California), 7º día
consecutivo, tarifas combinadas (blended), exento/no-exento salarial, **reglas de descanso/comida**
(prima por descanso perdido en CA), redondeo y períodos de gracia. **Esfuerzo:** Medio.

### 8. Reportes operativos y de costo laboral
**Falta:** registro de nómina (payroll register), horas por sitio/departamento, reporte de OT,
% de costo laboral, resumen de mayor (GL), export CSV en todo. Hoy reportes = formularios de fin
de año + calendario fiscal. **Esfuerzo:** Medio.

### 9. Comunicación de equipo
**Falta:** anuncios in-org, chat/mensajería, notas de turno, confirmación de lectura. Hoy solo hay
broadcasts admin→tenant. Homebase/Connecteam lo traen integrado. **Esfuerzo:** Medio.

### 10. Auto-presentación de impuestos (e-file en vivo)
Los stubs existen (track1099, IRS FIRE, CRA XML) pero **no presentan de verdad**. Falta 941
trimestral, presentaciones estatales, transmisión W-2/W-3, **remisión de pagos (EFTPS)**.
Además los brackets son **proyección 2026** (validar antes de producción). **Esfuerzo:** Alto + compliance.

---

## 🟡 Tier 3 — Escala, empresa y confianza

- **Estructura org**: departamentos/equipos, puestos, grados salariales, edición self-service del perfil, campos personalizados. (Hoy la org es plana.)
- **SSO/SAML/SCIM** (Google/Microsoft) y webhooks **salientes** + Zapier/Make. (Hoy solo entrantes.)
- **Beneficios**: salud/dental/401k, deducciones, conexión a aseguradoras (upsell de Gusto).
- **Compliance**: salario mínimo por localidad, **impuestos locales** (NYC, Filadelfia, Ohio), predictive scheduling (NYC/SF/Oregon), ACA (1095-C), reporte de nuevo empleado al estado, multi-estado.
- **ATS / contratación**: publicar vacantes, seguimiento de candidatos.
- **Confianza/calidad**: cobertura de tests E2E (hoy solo unit del motor+QBO + visual), auditoría de accesibilidad, camino a **SOC 2**, export de datos/GDPR, testimonios reales, SLA/uptime.

---

## 🎯 Secuencia recomendada (de mayor a menor impacto)

| Fase | Qué | Resultado |
|------|-----|-----------|
| **A** | Scheduling (turnos, publicar, swaps, open shifts) | Compite con Homebase/7shifts/When I Work |
| **B** | PTO/Tiempo libre (políticas, solicitudes, saldos) | Cierra el vacío de RRHH básico |
| **C** | Auto-onboarding + documentos + e-sign | Reduce fricción de alta; cumple I-9/W-4 |
| **D** | Propinas + 1 POS (Toast o Square) | Credibilidad en restaurantes |
| **E** | Depósito directo (proveedor embebido) | "Nómina de verdad" vs Gusto/Square |
| **F** | Certified payroll WH-347 + job costing | Gana en construcción |
| **G** | Reportes laborales + compliance OT/descansos | Profundidad operativa |

> **A–D** se pueden construir con el mismo stack actual (Next + Supabase + Expo) sin
> dependencias externas pesadas. **E** y la auto-presentación fiscal requieren un proveedor
> regulado y compliance — son las de mayor esfuerzo/riesgo.

---

## Nota honesta
Esto es un análisis **de features** sobre el código actual. Los temas fiscales/legales
(brackets, e-file, ACH, prevailing wage) deben validarse con un especialista antes de
producción — MyJova hoy los modela correctamente pero algunos están en modo stub/proyección.
