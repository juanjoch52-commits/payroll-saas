# Development Guide

## Local Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ (or use Supabase)
- Git

### Installation Steps

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd payroll-saas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Setup Supabase**
   ```bash
   # Create a new project at supabase.com
   # Copy connection details to .env.local
   
   # Push migrations
   npm run db:push
   
   # Seed test data (optional)
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```
   
   Visit: [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router (routes & layouts)
│   ├── [locale]/          # Language routing (en, es)
│   ├── api/               # API endpoints
│   ├── auth/              # Authentication pages
│   └── globals.css        # Global styles
├── components/            # Reusable React components
│   ├── auth/              # Login, signup, etc.
│   ├── employee/          # Employee management
│   ├── payroll/           # Payroll calculation & display
│   ├── common/            # Shared components (header, sidebar, etc.)
│   └── ui/                # UI primitives (buttons, inputs, etc.)
├── lib/                   # Utilities & helpers
│   ├── supabase.ts        # Database client
│   ├── auth.ts            # Auth functions
│   ├── payroll-calculations.ts  # Tax & payroll math
│   └── utils/             # Formatting, validation, etc.
├── hooks/                 # Custom React hooks
├── stores/                # Zustand state management
├── types/                 # TypeScript types
└── styles/                # CSS modules & global styles

supabase/
├── migrations/            # Database migration scripts
└── seed.sql              # Test data

public/                   # Static assets

docs/                     # Documentation
├── API.md                # API endpoints
├── DATABASE.md           # Database schema
└── COMPONENTS.md         # Component library
```

## Key Features to Implement

### Phase 1: MVP
- [x] Database schema
- [x] Authentication (Supabase Auth)
- [ ] Employee management UI
- [ ] Payroll calculation engine
- [ ] Pay stub generation
- [ ] Basic reporting

### Phase 2: Enhanced
- [ ] Direct deposit integration
- [ ] State tax calculations
- [ ] Advanced reporting
- [ ] Employee portal
- [ ] Mobile app

## Common Tasks

### Add a New API Endpoint

1. Create route handler in `src/app/api/[resource]/route.ts`
2. Add TypeScript types in `src/types/index.ts`
3. Import auth functions from `src/lib/auth.ts`
4. Write response handlers with proper error handling
5. Test with curl or Postman

Example:
```typescript
// src/app/api/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Your logic here
}
```

### Add a New Component

1. Create component in appropriate folder under `src/components/`
2. Use TypeScript for type safety
3. Prefer functional components with hooks
4. Export component from `index.ts` for easy imports

Example:
```typescript
// src/components/employee/EmployeeForm.tsx
import { useState } from 'react';
import { Employee, CreateEmployeeForm } from '@/types';

interface EmployeeFormProps {
  onSubmit: (data: CreateEmployeeForm) => void;
  loading?: boolean;
}

export function EmployeeForm({ onSubmit, loading }: EmployeeFormProps) {
  const [formData, setFormData] = useState<CreateEmployeeForm>({
    // ...
  });

  return (
    // JSX
  );
}
```

### Test Tax Calculations

The payroll calculation module includes tests for federal tax withholding.

```typescript
import { calculateTaxWithholdings, estimateTakeHomePay } from '@/lib/payroll-calculations';

const taxes = calculateTaxWithholdings({
  grossPay: 2000,
  payFrequency: 'biweekly',
  filingStatus: 'single',
  allowances: 0,
  stateTaxRate: 5, // Example: 5% state tax
});

console.log(taxes);
// Output:
// {
//   federalIncomeTax: 223.46,
//   socialSecurityTax: 124,
//   medicareTax: 29,
//   stateTax: 100,
//   localTax: 0,
//   totalTax: 476.46
// }
```

## Database Migrations

Add new migrations as SQL files in `supabase/migrations/`:

```bash
# Create migration
touch supabase/migrations/002_add_benefits_table.sql

# Push migration
npm run db:push
```

## Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
DATABASE_URL=your-postgres-url
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional:
```bash
STRIPE_PUBLIC_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_GTAG_ID=G-xxx
```

## Debugging

### Enable Query Logging

In Supabase SQL Editor:
```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### View Server Logs

```bash
# Terminal where `npm run dev` is running
# Look for error messages and stack traces
```

### Browser DevTools

1. Open Chrome DevTools (F12)
2. **Network tab**: Monitor API calls
3. **Console**: Check for JS errors
4. **Application > Local Storage**: Check auth tokens

## Testing

```bash
# Run tests (when test suite is added)
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Performance Tips

1. **Use React DevTools Profiler** to identify slow renders
2. **Enable query optimization** in Supabase dashboard
3. **Add indexes** for frequently filtered columns
4. **Lazy load components** with dynamic imports
5. **Optimize images** before uploading

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production guidelines.

## Troubleshooting

### Port 3000 already in use
```bash
# Kill process on port 3000
lsof -ti :3000 | xargs kill -9
npm run dev
```

### Supabase connection issues
- Verify `.env.local` variables
- Check Supabase project is active
- Look for firewall/VPN blocking database

### TypeScript errors
```bash
# Regenerate type definitions
npm run type-check
```

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open pull request

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.io/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [React Hooks](https://react.dev/reference/react/hooks)

---

**Questions?** Check the `docs/` folder or create an issue in the repository.
