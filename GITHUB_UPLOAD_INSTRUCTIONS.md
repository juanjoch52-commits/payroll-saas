# 📤 CÓMO SUBIR A GITHUB

Tu código está 100% listo. Solo necesita subirse a GitHub. Aquí hay 3 formas:

---

## ✅ OPCIÓN 1: Script Automático (MÁS FÁCIL)

En tu Mac, abre la Terminal y ejecuta:

```bash
cd ~/Desktop  # o donde tengas descargado el código

# Si clonaste el repo vacío:
cd payroll-saas

# Ahora ejecuta:
bash PUSH_TO_GITHUB.sh
```

Ese script hace todo automáticamente ✅

---

## ✅ OPCIÓN 2: Comandos Manuales

En Terminal (en la carpeta del proyecto):

```bash
git config user.email "juanjoch52@gmail.com"
git config user.name "Juan"
git remote remove origin 2>/dev/null
git remote add origin https://github.com/juanjoch52-commits/payroll-saas.git
git branch -M main
git push -u origin main
```

---

## ✅ OPCIÓN 3: GitHub Web Interface

1. Ve a: https://github.com/juanjoch52-commits/payroll-saas
2. Haz clic en "Add file" → "Upload files"
3. Selecciona todos los archivos de tu carpeta Payroll webapp
4. Haz clic en "Commit changes"

---

## 🚀 DESPUÉS DE SUBIR:

Una vez que los archivos estén en GitHub:

1. Ve a **Vercel**: https://vercel.com/dashboard
2. Haz clic en **"Add New"** → **"Project"**
3. Selecciona **"payroll-saas"** en la lista
4. Configura las **variables de entorno** desde Supabase
5. Haz clic en **"Deploy"**
6. ¡Listo! Tu app estará live en 5-10 minutos 🎉

---

## 🔑 Variables de Entorno que necesitarás:

```
NEXT_PUBLIC_SUPABASE_URL=https://project-epd7f.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[de Supabase]
SUPABASE_SERVICE_ROLE_KEY=[de Supabase]
DATABASE_URL=[de Supabase]
NEXT_PUBLIC_APP_URL=https://payroll-saas.vercel.app
NEXT_PUBLIC_DEFAULT_LOCALE=en
```

---

**Status**: ✅ Listo para GitHub  
**Próximo paso**: Desplegar en Vercel  
**Tu app estará en**: https://payroll-saas.vercel.app
