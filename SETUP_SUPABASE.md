# 🔧 Guía: Configurar Supabase para PayrollHub

## ¿Por qué Supabase?

Supabase es PostgreSQL como servicio (PaaS). Proporciona:
- ✅ Base de datos PostgreSQL gratis
- ✅ Autenticación integrada
- ✅ API REST automática
- ✅ Row Level Security (RLS)
- ✅ Perfect para MVP

## Paso 1: Crear una Cuenta en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en "Sign Up" (arriba a la derecha)
3. Crea una cuenta con tu email
4. Verifica tu email (mira en tu bandeja de entrada)

## Paso 2: Crear un Nuevo Proyecto

1. En el dashboard de Supabase, haz clic en "New Project"
2. Rellena los campos:
   - **Name**: `payroll-saas` (o el nombre que prefieras)
   - **Organization**: Selecciona la que se creó automáticamente
   - **Database Password**: Elige una contraseña segura (la necesitarás)
   - **Region**: Selecciona **"US East (us-east-1)"** (importante para impuestos)
   - **Pricing Plan**: Free tier está bien para MVP

3. Haz clic en "Create new project"
4. **Espera 2-3 minutos** mientras Supabase inicializa el proyecto

## Paso 3: Obtener tus Credenciales

Una vez que el proyecto esté listo:

### 3a. URL del Proyecto
1. Ve a **Settings → API** (en el menú izquierdo)
2. Busca "Project URL"
3. Copia la URL completa
4. Pégala en `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   ```

### 3b. Anon Key (Clave Pública)
1. En la misma página **Settings → API**
2. Busca "Anon (public)" en la sección "API Keys"
3. Copia esa larga cadena de caracteres
4. Pégala en `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

### 3c. Service Role Key (Clave Privada)
1. En **Settings → API**
2. Busca "Service_Role (secret)" - debajo de Anon Key
3. **IMPORTANTE**: Esta es una clave secreta - protégela
4. Copia esa cadena
5. Pégala en `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

## Paso 4: Configurar tu .env.local

En la carpeta del proyecto, edita `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
DATABASE_URL=postgresql://...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=en
```

## Paso 5: Aplicar Migraciones de Base de Datos

Ahora necesitas crear las tablas en tu base de datos:

```bash
cd /path/to/payroll-saas
npm install
npm run db:push
```

Esto ejecutará los scripts SQL en `supabase/migrations/` y creará todas las tablas necesarias.

## Paso 6: Verificar que Todo Funciona

```bash
npm run dev
```

Abre tu navegador en [http://localhost:3000](http://localhost:3000)

Si ves la página de inicio sin errores - ¡Felicitaciones! ✅

## Solución de Problemas

### "Error: Cannot find module 'supabase-js'"
```bash
npm install @supabase/supabase-js
```

### "Error: NEXT_PUBLIC_SUPABASE_URL is not defined"
Verifica que `.env.local` tenga las credenciales correctas.

### "Error: connection refused"
- Verifica que la URL de Supabase es correcta
- Comprueba tu conexión a internet
- Intenta crear el proyecto nuevamente

### "Error al aplicar migraciones"
- Asegúrate de que tus credenciales de Supabase son correctas
- El Service Role Key debe estar en `SUPABASE_SERVICE_ROLE_KEY`
- Intenta manualmente:
  ```bash
  supabase link --project-ref xxxxx
  supabase db push
  ```

## Seguridad (Importante!)

⚠️ **NUNCA commitees `.env.local` a Git**

Ya está en `.gitignore`, pero verifica:

```bash
git status
# No debe aparecer .env.local
```

Las claves en `.env.local` son secretas. Si las expones accidentalmente en GitHub:
1. Regenera las claves en Supabase (Settings → API)
2. Actualiza `.env.local`

## Pasos Siguientes

Una vez que Supabase esté configurado:

1. **Lanza el servidor**: `npm run dev`
2. **Lee la documentación**: `QUICK_START.md`
3. **Comienza a construir**: Ver `DEVELOPMENT.md`

## ¿Necesitas Ayuda?

- [Documentación de Supabase](https://supabase.io/docs)
- [Foro de Supabase](https://github.com/supabase/supabase/discussions)
- [Nuestras guías](./INDEX.md)

---

¡Ahora estás listo para construir! 🚀
