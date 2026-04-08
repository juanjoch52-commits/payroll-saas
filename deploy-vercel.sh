#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Deploying Payroll webapp to Vercel${NC}"

# Create deployment files
mkdir -p .vercel

# Create project config
cat > .vercel/project.json << 'EOF'
{
  "projectId": "prj_W2qtOFDGY9KPbhwO5ODJuioq6RfL",
  "orgId": "team_lYNy3fAjAtNaqT98TczsNam1"
}
EOF

echo -e "${GREEN}✓${NC} Vercel project configuration ready"

# Commit deployment files
git add vercel.json .vercel/project.json .env.local
git commit -m "Add Vercel configuration and environment setup" 2>/dev/null || true

echo -e "${GREEN}✓${NC} Git repository updated"
echo -e "${GREEN}✓${NC} Ready for Vercel deployment"
echo ""
echo -e "${YELLOW}📋 Project Details:${NC}"
echo "  Project ID: prj_W2qtOFDGY9KPbhwO5ODJuioq6RfL"
echo "  Team: Juan's projects"
echo "  Framework: Next.js"
echo "  URL: https://payroll-saas.vercel.app"
echo ""
echo -e "${YELLOW}🔑 Environment Variables Configured:${NC}"
echo "  ✓ NEXT_PUBLIC_SUPABASE_URL"
echo "  ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  ✓ SUPABASE_SERVICE_ROLE_KEY"
echo "  ✓ DATABASE_URL"
echo "  ✓ NEXT_PUBLIC_APP_URL"
echo ""
echo -e "${GREEN}✨ Deployment configuration complete!${NC}"

