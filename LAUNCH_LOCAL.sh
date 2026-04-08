#!/bin/bash

# PayrollHub - Local Launch Script
# Este script configura y lanza el proyecto localmente

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                     PAYROLLHUB LOCAL SETUP                         ║"
echo "║              SaaS de Nómina para Pequeños Negocios                ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check Node.js
echo "✓ Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Instálalo desde https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node -v)
echo "   ✅ Node.js instalado: $NODE_VERSION"
echo ""

# Step 2: Check npm
echo "✓ Verificando npm..."
NPM_VERSION=$(npm -v)
echo "   ✅ npm instalado: $NPM_VERSION"
echo ""

# Step 3: Install dependencies
echo "✓ Instalando dependencias..."
echo "   Este paso puede tomar 2-3 minutos..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Error al instalar dependencias"
    exit 1
fi
echo "   ✅ Dependencias instaladas"
echo ""

# Step 4: Environment setup
echo "✓ Configurando variables de entorno..."
if [ ! -f .env.local ]; then
    echo "   📝 Creando .env.local desde .env.example..."
    cp .env.example .env.local
    echo "   ⚠️  IMPORTANTE: Debes editar .env.local con tus credenciales de Supabase"
    echo ""
    echo "   Pasos:"
    echo "   1. Ve a https://supabase.com"
    echo "   2. Crea un nuevo proyecto (región: USA)"
    echo "   3. Copia estas claves en .env.local:"
    echo "      - NEXT_PUBLIC_SUPABASE_URL"
    echo "      - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "      - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "   Una vez configurado, ejecuta:"
    echo "   $ npm run dev"
    echo ""
    exit 0
else
    echo "   ✅ .env.local ya existe"
fi
echo ""

# Step 5: Check if .env is configured
echo "✓ Verificando configuración de Supabase..."
if grep -q "your-supabase-url\|your-anon-key" .env.local; then
    echo "   ⚠️  Aún necesitas configurar tus credenciales de Supabase"
    echo "   Edita .env.local con tus claves"
    exit 0
fi
echo "   ✅ Supabase configurado"
echo ""

# Step 6: Database setup (optional)
echo "✓ ¿Deseas aplicar las migraciones de base de datos?"
echo "   (Requiere credenciales de Supabase configuradas)"
read -p "   Continuar con npm run db:push? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    npm run db:push
    echo "   ✅ Migraciones aplicadas"
fi
echo ""

# Step 7: Launch dev server
echo "✓ Lanzando servidor de desarrollo..."
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "🚀 SERVIDOR LANZADO"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "📱 Abre tu navegador en: http://localhost:3000"
echo ""
echo "📚 Documentación:"
echo "   - Guía de desarrollo: DEVELOPMENT.md"
echo "   - Arquitectura: docs/ARCHITECTURE.md"
echo "   - Cómo extender: EXTENDING_THE_PROJECT.md"
echo ""
echo "💡 Tips:"
echo "   - Presiona Ctrl+C para detener el servidor"
echo "   - Los cambios en código se recargan automáticamente"
echo "   - Abre la consola del navegador para ver errores (F12)"
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo ""

npm run dev
