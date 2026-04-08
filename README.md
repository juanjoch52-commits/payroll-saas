# Payroll SaaS - Gestión de Nómina para Pequeños Negocios

**PayrollHub** es una plataforma web moderna para gestionar empleados, calcular nóminas y generar reportes fiscales. Diseñado específicamente para pequeñas empresas en industrias como construcción, remodelación, mecánica y restaurantes.

## 🎯 Características del MVP

### Gestión de Empleados
- ✅ Crear, editar, eliminar empleados
- ✅ Datos personales y de contacto
- ✅ Información de salario y beneficios
- ✅ Historial de cambios

### Cálculo de Nómina
- ✅ Cálculo automático de salarios
- ✅ Deducciones (impuestos federales, FICA)
- ✅ Bonificaciones y horas extra
- ✅ Retenciones voluntarias

### Reportes
- ✅ Recibos de pago (stubs)
- ✅ Reporte de impuestos federales
- ✅ Análisis de costos laborales
- ✅ Exportación a PDF/CSV

### Seguridad
- ✅ Autenticación con Supabase Auth
- ✅ Control multi-tenant (cada empresa aislada)
- ✅ Roles y permisos (Admin, Manager, Employee)
- ✅ Cumplimiento GDPR

## 📋 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 + React 18 + TailwindCSS |
| Backend | Next.js API Routes + Supabase |
| Base de Datos | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| UI Components | Shadcn/ui + Lucide Icons |
| Validación | Zod + React Hook Form |
| Estado | Zustand |
| Internacionalización | next-intl (EN/ES) |

## 🚀 Guía Rápida de Instalación

### Prerequisitos
- Node.js 18+
- npm o yarn
- Cuenta en Supabase

### Pasos

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd payroll-saas

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local

# 4. Configurar Supabase
npm run db:push

# 5. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🏗️ Estructura del Proyecto

```
payroll-saas/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/          # Rutas por idioma
│   │   ├── api/               # API Routes
│   │   └── globals.css        # Estilos globales
│   ├── components/            # Componentes React reutilizables
│   │   ├── auth/              # Componentes de autenticación
│   │   ├── employee/          # Componentes de empleados
│   │   ├── payroll/           # Componentes de nómina
│   │   └── common/            # Componentes comunes
│   ├── lib/
│   │   ├── supabase.ts        # Cliente Supabase
│   │   ├── auth.ts            # Funciones de autenticación
│   │   └── utils/             # Utilidades (formateo, validación)
│   ├── types/                 # TypeScript types
│   ├── hooks/                 # React custom hooks
│   └── stores/                # Zustand stores
├── supabase/
│   ├── migrations/            # Migraciones de base de datos
│   └── seed.sql              # Datos de prueba
├── public/                    # Activos estáticos
├── .env.example              # Variables de entorno
├── tsconfig.json             # Configuración TypeScript
├── tailwind.config.ts        # Configuración Tailwind
├── next.config.js            # Configuración Next.js
└── package.json
```

## 📊 Modelo de Base de Datos

### Tablas Principales

**companies**
- id, name, address, city, state, zip, phone, email, ein (federal tax id)

**employees**
- id, company_id, first_name, last_name, email, phone, hire_date, salary, hourly_rate, department

**payroll_runs**
- id, company_id, pay_period_start, pay_period_end, status, created_at

**payroll_items**
- id, payroll_run_id, employee_id, gross_salary, federal_tax, fica_tax, net_pay

**employees_history** (auditoría)
- id, employee_id, action, changed_fields, user_id, created_at

## 🔐 Autenticación y Autorización

### Roles
- **Admin**: Acceso total, gestión de usuarios
- **Manager**: Gestión de empleados y nómina
- **Employee**: Solo puede ver su información personal

### Tabla RLS (Row Level Security)
- Cada usuario puede acceder solo a su empresa
- Los empleados solo ven su propia información

## 💳 Modelo de Precios (SaaS)

| Plan | Precio | Empleados | Características |
|------|--------|-----------|-----------------|
| Starter | $50/mes | Hasta 5 | Básico |
| Professional | $100/mes | Hasta 25 | Reportes avanzados |
| Enterprise | Custom | Ilimitado | Soporte dedicado |

## 📱 Roadmap Futuro (Post-MVP)

- [ ] Integración bancaria (ACH, transferencias)
- [ ] Gestión de impuestos estatales
- [ ] Portal para empleados (consultar recibos)
- [ ] Integración con contabilidad (QuickBooks, Xero)
- [ ] App móvil
- [ ] Notificaciones de pago
- [ ] Cumplimiento I-9
- [ ] Gestión de beneficios

## 🛠️ Desarrollo

### Crear una nueva página

```bash
# Páginas se crean en src/app/[locale]/
# con estructura automática de enrutamiento
```

### Variables de Entorno Requeridas

```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
DATABASE_URL=your-db-url
```

## 📞 Soporte y Documentación

- [Documentación API](./docs/api.md)
- [Guía de Base de Datos](./docs/database.md)
- [Guía de Componentes](./docs/components.md)

## 📄 Licencia

MIT

## 👥 Equipo

Desarrollado por: Payroll SaaS Team

---

**¿Preguntas?** Contacta a: support@payrollhub.io
