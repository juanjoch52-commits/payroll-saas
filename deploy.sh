#!/bin/bash
set -e

echo "🚀 Starting Payroll webapp deployment to Vercel..."

# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://project-epd7f.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3QtZXBkN2YiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMzAwMDAwMCwiZXhwIjoxODMwNzY4MDAwfQ.DUMMY_TOKEN"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3QtZXBkN2YiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzAzMDAwMDAwLCJleHAiOjE4MzA3NjgwMDB9.DUMMY_SERVICE_KEY"
export DATABASE_URL="postgresql://postgres:password@project-epd7f.supabase.co:5432/postgres"
export NEXT_PUBLIC_APP_URL="https://payroll-saas.vercel.app"
export NEXT_PUBLIC_DEFAULT_LOCALE="en"

echo "✓ Environment variables set"
echo "✓ Deployment configuration ready"
echo "✓ Ready for Vercel deployment"

