# 🔧 Extending the Project

This guide shows how to add new features to PayrollHub following established patterns.

## Adding a New Table to Database

### 1. Create Migration File

```bash
# Create new migration
touch supabase/migrations/002_add_benefits_table.sql
```

### 2. Write SQL

```sql
-- supabase/migrations/002_add_benefits_table.sql

create type benefit_type as enum ('health', 'dental', '401k', 'hsa', 'fsa');

create table benefits (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  type benefit_type not null,
  monthly_cost numeric(10, 2) not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

alter table benefits enable row level security;

create policy "Companies can view their benefits"
  on benefits for select
  using (
    company_id in (
      select id from companies where auth.uid() = user_id
    )
  );

create index idx_benefits_company_id on benefits(company_id);
```

### 3. Push Migration

```bash
npm run db:push
```

### 4. Update TypeScript Types

```typescript
// src/types/index.ts

export type BenefitType = 'health' | 'dental' | '401k' | 'hsa' | 'fsa';

export interface Benefit {
  id: string;
  company_id: string;
  name: string;
  type: BenefitType;
  monthly_cost: number;
  is_active: boolean;
  created_at: string;
}
```

---

## Adding a New API Endpoint

### Example: Get Company Employees with Filters

```typescript
// src/app/api/employees/search/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/supabase';

interface SearchParams {
  company_id: string;
  status?: string;
  department?: string;
  search?: string;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id required' },
        { status: 400 }
      );
    }

    // 3. Verify ownership
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('user_id', user.id)
      .single();

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // 4. Build query
    let query = supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId);

    // 5. Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (department) {
      query = query.eq('department', department);
    }
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    // 6. Execute query
    const { data: employees, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;

    // 7. Return results
    return NextResponse.json({
      success: true,
      data: employees,
      count: employees?.length || 0,
    });
  } catch (error) {
    console.error('Error searching employees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search employees' },
      { status: 500 }
    );
  }
}
```

---

## Adding a New React Component

### Example: Employee Card Component

```typescript
// src/components/employee/EmployeeCard.tsx

import { Employee } from '@/types';
import { formatCurrency, getInitials } from '@/lib/utils/formatting';

interface EmployeeCardProps {
  employee: Employee;
  onEdit?: (employee: Employee) => void;
  onDelete?: (id: string) => void;
}

export function EmployeeCard({
  employee,
  onEdit,
  onDelete,
}: EmployeeCardProps) {
  const initials = getInitials(employee.first_name, employee.last_name);

  return (
    <div className="card hover:shadow-lg transition-shadow">
      {/* Avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
          {initials}
        </div>
        <div>
          <h3 className="font-bold text-lg">
            {employee.first_name} {employee.last_name}
          </h3>
          <p className="text-gray-600 text-sm">{employee.job_title}</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm mb-4">
        <p>
          <span className="font-semibold">Email:</span> {employee.email}
        </p>
        <p>
          <span className="font-semibold">Phone:</span> {employee.phone}
        </p>
        <p>
          <span className="font-semibold">Department:</span>{' '}
          {employee.department || 'N/A'}
        </p>
        {employee.is_hourly ? (
          <p>
            <span className="font-semibold">Rate:</span>{' '}
            {formatCurrency(employee.hourly_rate || 0)}/hr
          </p>
        ) : (
          <p>
            <span className="font-semibold">Salary:</span>{' '}
            {formatCurrency(employee.salary || 0)}/year
          </p>
        )}
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            employee.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {employee.status}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit(employee)}
            className="btn-secondary flex-1"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(employee.id)}
            className="btn-danger flex-1"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Adding State Tax Calculation

### 1. Create State Tax Module

```typescript
// src/lib/state-taxes.ts

interface StateTaxRate {
  standardDeduction: number;
  brackets: Array<{
    min: number;
    max: number;
    rate: number;
  }>;
}

const STATE_TAX_RATES: Record<string, StateTaxRate> = {
  CA: {
    standardDeduction: 5202,
    brackets: [
      { min: 0, max: 10000, rate: 0.01 },
      { min: 10000, max: 23000, rate: 0.02 },
      // ... more brackets
    ],
  },
  TX: {
    standardDeduction: 0, // No state income tax
    brackets: [],
  },
  // Add more states...
};

export function calculateStateTax(
  grossPay: number,
  state: string,
  filingStatus: string
): number {
  const rates = STATE_TAX_RATES[state];
  if (!rates || rates.brackets.length === 0) {
    return 0; // No state income tax
  }

  // Similar calculation to federal taxes
  // ...
  return 0;
}
```

### 2. Update Payroll Calculation

```typescript
// src/lib/payroll-calculations.ts

import { calculateStateTax } from './state-taxes';

export function calculateTaxWithholdings(params: TaxCalculationParams) {
  // ... existing federal tax code ...

  // Add state tax
  const stateTax = calculateStateTax(
    grossPay,
    params.state || 'TX',
    params.filingStatus
  );

  // ...return updated withholdings...
}
```

---

## Adding a New Page

### 1. Create Page Component

```typescript
// src/app/[locale]/dashboard/benefits/page.tsx

import { Metadata } from 'next';
import { BenefitsList } from '@/components/benefits/BenefitsList';
import { AddBenefitButton } from '@/components/benefits/AddBenefitButton';

export const metadata: Metadata = {
  title: 'Benefits Management',
};

export default function BenefitsPage() {
  return (
    <main className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1>Benefits Management</h1>
        <AddBenefitButton />
      </div>

      <BenefitsList />
    </main>
  );
}
```

### 2. Create Components

```typescript
// src/components/benefits/BenefitsList.tsx

'use client';

import { useEffect, useState } from 'react';
import { Benefit } from '@/types';

export function BenefitsList() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBenefits();
  }, []);

  async function fetchBenefits() {
    try {
      const response = await fetch(`/api/benefits?company_id=${companyId}`);
      const data = await response.json();
      if (data.success) {
        setBenefits(data.data);
      }
    } catch (error) {
      console.error('Error fetching benefits:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="spinner"></div>;

  return (
    <div className="grid gap-4">
      {benefits.map((benefit) => (
        <div key={benefit.id} className="card">
          <h3>{benefit.name}</h3>
          <p>{benefit.type}</p>
          <p>${benefit.monthly_cost}/month</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Adding Authentication to Pages

### Protect a Page with Middleware

```typescript
// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token');

  // Redirect to login if no token
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

## Adding Validation to Forms

### Create Validation Schema

```typescript
// src/lib/validation/employee.ts

import { z } from 'zod';

export const createEmployeeSchema = z.object({
  first_name: z.string().min(2, 'First name required'),
  last_name: z.string().min(2, 'Last name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  hire_date: z.string().datetime(),
  is_hourly: z.boolean(),
  salary: z.number().min(0).optional(),
  hourly_rate: z.number().min(0).optional(),
  federal_allowances: z.number().min(0).max(10),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
```

### Use in Component

```typescript
// src/components/employee/EmployeeForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEmployeeSchema } from '@/lib/validation/employee';

export function EmployeeForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createEmployeeSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('first_name')} />
      {errors.first_name && <span>{errors.first_name.message}</span>}
      {/* More fields... */}
    </form>
  );
}
```

---

## Adding Error Handling

### Create Error Boundary

```typescript
// src/components/ErrorBoundary.tsx

'use client';

import { useEffect } from 'react';

export function ErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="alert alert-danger">
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

---

## Adding Logging

### Create Logger Utility

```typescript
// src/lib/utils/logger.ts

export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
  },
  error: (message: string, error: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
  },
};

// Usage
import { logger } from '@/lib/utils/logger';

logger.info('Employee created', { id: employee.id });
logger.error('Failed to fetch payroll', error);
```

---

## Common Patterns

### Pattern: Fetching Data

```typescript
async function fetchData(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}
```

### Pattern: Form Submission

```typescript
async function onSubmit(data: FormData) {
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      // Handle success
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    // Handle error
  }
}
```

### Pattern: Protected API Route

```typescript
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const { companyId } = await request.json();
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('user_id', user.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Your logic here
}
```

---

## Testing Your Changes

### Test API Endpoint

```bash
# Test with curl
curl -X GET http://localhost:3000/api/employees?company_id=123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Or use Postman/Insomnia
# Set header: Authorization: Bearer YOUR_JWT_TOKEN
```

### Test Component

```typescript
// src/components/benefits/BenefitsList.test.tsx

import { render, screen } from '@testing-library/react';
import { BenefitsList } from './BenefitsList';

describe('BenefitsList', () => {
  it('renders benefits', () => {
    render(<BenefitsList />);
    expect(screen.getByText(/Health/)).toBeInTheDocument();
  });
});
```

---

## Deploying Changes

### 1. Test Locally

```bash
npm run dev
# Test all changes
```

### 2. Build

```bash
npm run build
# Check for errors
```

### 3. Deploy to Vercel

```bash
git add .
git commit -m "Add benefits feature"
git push origin feature/benefits
# Create Pull Request on GitHub
# Vercel auto-deploys after merge
```

---

## Best Practices

✅ **Always validate input** - Use Zod schemas
✅ **Handle errors gracefully** - Return proper HTTP status codes
✅ **Use TypeScript** - Catch bugs before runtime
✅ **Write comments** - Explain complex logic
✅ **Test before shipping** - Manual + automated tests
✅ **Keep types DRY** - Define once, reuse everywhere
✅ **Follow patterns** - Consistency across codebase
✅ **Secure by default** - Auth checks on every API route
✅ **Audit changes** - Log important actions
✅ **Version migrations** - Always version database changes

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Unauthorized" on API call | Check JWT token in cookies |
| "Type not found" | Update types in `src/types/index.ts` |
| "Table not found" | Run `npm run db:push` |
| "CORS error" | Check `next.config.js` headers |
| "Component not rendering" | Check if it's a client component with 'use client' |

---

**Happy extending! 🚀**
