#!/bin/bash

# Script para subir el código a GitHub
# Ejecuta este script desde la carpeta Payroll webapp

echo "🚀 Subiendo Payroll webapp a GitHub..."

# Configurar las credenciales de git (si es necesario)
git config user.email "juanjoch52@gmail.com"
git config user.name "Juan"

# Eliminar el remote anterior si existe
git remote remove origin 2>/dev/null

# Agregar el nuevo remote
git remote add origin https://github.com/juanjoch52-commits/payroll-saas.git

# Cambiar a rama main
git branch -M main

# Hacer push
echo "📤 Enviando archivos a GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ ¡Éxito! Tu código está ahora en GitHub"
    echo ""
    echo "🔗 Ve a: https://github.com/juanjoch52-commits/payroll-saas"
    echo ""
    echo "🚀 Ahora puedes desplegar en Vercel"
else
    echo "❌ Error al subir. Intenta manualmente o contacta soporte."
fi
