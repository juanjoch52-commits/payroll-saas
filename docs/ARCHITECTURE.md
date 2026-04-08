# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Browser (Client)                     │
│  (Next.js React Components - TailwindCSS Styled)            │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTPS
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Server                        │
│  (Node.js 18+, running on Vercel or self-hosted)           │
│                                                              │
│  ├─ App Router (src/app)                                   │
│  ├─ API Routes (src/app/api)                               │
│  ├─ Middleware (Auth, RLS enforcement)                     │
│  └─ Server Components (Page layouts)                       │
└────────────────┬────────────────────────────────────────────┘
                 │ SQL
                 ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase (Hosted PostgreSQL)                    │
│                                                              │
│  ├─ Database (PostgreSQL 14+)                              │
│  │  ├─ companies                                            │
│  │  ├─ employees                                            │
│  │  ├─ payroll_runs                                         │
│  │  ├─ payroll_items                                        │
│  │  └─ audit_logs                                           │
│  │                                                           │
│  ├─ Authentication (Supabase Auth)                         │
│  │  ├─ User signup/login                                   │
│  │  ├─ JWT tokens                                          │
│  │  └─ Password reset                                      │
│  │                                                           │
│  ├─ Row Level Security (RLS)                               │
│  │  └─ Multi-tenant data isolation                         │
│  │                                                           │
│  └─ Realtime (Optional: for live updates)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18
- **Styling:** Tailwind CSS
- **State Management:** Zustand (lightweight store)
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **Charts:** Recharts (for reports)
- **HTTP Client:** Fetch API (built-in)

### Backend
- **Server Runtime:** Node.js 18+ (Next.js API Routes)
- **Language:** TypeScript
- **API Pattern:** RESTful JSON APIs

### Database
- **Provider:** Supabase (managed PostgreSQL)
- **Database:** PostgreSQL 14+
- **Auth:** Supabase Auth (JWT-based)
- **Security:** Row Level Security (RLS)
- **Features:** Realtime subscriptions, full-text search

### Infrastructure
- **Deployment:** Vercel (recommended) or self-hosted
- **Environment:** serverless functions (Vercel Edge)
- **DNS:** Cloudflare (optional)
- **Monitoring:** Sentry (optional)

### Development Tools
- **Package Manager:** npm or pnpm
- **Code Quality:** ESLint, Prettier
- **Testing:** Jest, React Testing Library (to be added)
- **Git:** GitHub

---

## Data Flow

### User Authentication Flow

```
1. User enters email/password → Sign Up Form
                 ↓
2. Submit to /api/auth/signup
                 ↓
3. Supabase Auth creates user
                 ↓
4. JWT token returned
                 ↓
5. Store in httpOnly cookie / session
                 ↓
6. Redirect to /dashboard
                 ↓
7. Protected routes use middleware to verify JWT
```

### Payroll Calculation Flow

```
1. User opens Payroll Run page
                 ↓
2. Select employees to include
                 ↓
3. Click "Calculate Payroll"
                 ↓
4. For each employee:
   a. GET employee data from DB
   b. POST to /api/payroll/calculate
   c. Calculate taxes using business logic
   d. Return breakdown (gross, taxes, net)
                 ↓
5. Display preview to user
                 ↓
6. User clicks "Confirm & Save"
                 ↓
7. INSERT payroll_run + payroll_items records
                 ↓
8. Generate pay stubs (PDF)
                 ↓
9. Display success message
```

### Multi-Tenant Data Isolation

```
Request with JWT Token
         ↓
Verify token → Extract user_id
         ↓
Query companies WHERE user_id = ?
         ↓
Use company_id from parameter
         ↓
Enforce RLS policy:
  SELECT * FROM employees WHERE company_id = ?
         ↓
Only data belonging to user's company returned
```

---

## Directory Structure

### `/src/app` - Next.js Routes

```
app/
├── [locale]/                    # Language routing
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── employees/
│   │   ├── payroll/
│   │   └── reports/
│   └── auth/
│       ├── login/page.tsx
│       ├── signup/page.tsx
│       └── reset-password/page.tsx
├── api/
│   ├── auth/
│   │   ├── signup/route.ts
│   │   ├── login/route.ts
│   │   └── logout/route.ts
│   ├── employees/
│   │   ├── route.ts             # GET, POST
│   │   └── [id]/route.ts        # GET, PUT, DELETE
│   ├── payroll/
│   │   ├── runs/route.ts
│   │   ├── calculate/route.ts
│   │   └── [id]/items/route.ts
│   └── reports/
│       ├── tax-summary/route.ts
│       └── payroll-summary/route.ts
├── layout.tsx                   # Root layout
└── globals.css                  # Global styles
```

### `/src/components` - Reusable Components

```
components/
├── auth/
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   └── ProtectedRoute.tsx
├── employee/
│   ├── EmployeeForm.tsx
│   ├── EmployeeList.tsx
│   ├── EmployeeCard.tsx
│   └── EmployeeDetails.tsx
├── payroll/
│   ├── PayrollForm.tsx
│   ├── PayrollCalculator.tsx
│   ├── PayStub.tsx
│   └── PayrollSummary.tsx
├── reports/
│   ├── TaxSummaryReport.tsx
│   ├── PayrollChart.tsx
│   └── ExportButton.tsx
├── common/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── Layout.tsx
│   └── Navigation.tsx
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── Alert.tsx
│   └── Loading.tsx
└── index.ts                     # Re-exports
```

### `/src/lib` - Utilities & Business Logic

```
lib/
├── supabase.ts                 # Supabase client
├── auth.ts                     # Auth functions
├── payroll-calculations.ts     # Tax math (core logic!)
├── utils/
│   ├── formatting.ts           # Currency, dates
│   ├── validation.ts           # Form validation
│   └── api.ts                  # API helpers
└── hooks.ts                    # Reusable hooks
```

### `/src/types` - TypeScript Definitions

```
types/
├── index.ts                    # Main types file
├── database.ts                 # DB schema types (auto-generated)
└── api.ts                      # API response types
```

---

## Key Architecture Decisions

### 1. **Server-Side Rendering (SSR)**
- ✅ Pros: SEO, security, performance
- ✅ Pages render on server before sending to client
- ✅ Auth middleware runs server-side
- Implementation: Next.js App Router with server components

### 2. **API Layer**
- ✅ RESTful JSON APIs for client-server communication
- ✅ Request validation with Zod
- ✅ Error handling with standard HTTP codes
- ✅ Middleware for CORS, rate limiting (Vercel)

### 3. **Authentication Strategy**
- ✅ JWT tokens from Supabase Auth
- ✅ Stored in httpOnly cookies (secure)
- ✅ Automatic token refresh
- ✅ Protected routes with middleware

### 4. **Database Security**
- ✅ Row Level Security (RLS) enforced at DB level
- ✅ Every query filtered by company_id
- ✅ Audit logs track all changes
- ✅ Never expose database credentials to client

### 5. **Component Architecture**
- ✅ Server components (default) for better performance
- ✅ Client components only when needed (forms, interactivity)
- ✅ Reusable UI component library
- ✅ Composition over inheritance

### 6. **State Management**
- ✅ Zustand for global state (lightweight)
- ✅ React Context for auth context
- ✅ React Query for server state (future)
- ✅ Form state with React Hook Form

---

## Security Considerations

### 1. **Authentication**
```typescript
// Every API route checks auth
const user = await getAuthUser();
if (!user) return 401;
```

### 2. **Authorization**
```typescript
// Verify user owns the company
const { data: company } = await supabase
  .from('companies')
  .select('id')
  .eq('id', companyId)
  .eq('user_id', user.id)
  .single();
if (!company) return 403;
```

### 3. **Data Isolation**
```sql
-- RLS policy ensures data isolation
create policy "Users can view their own company"
  on companies for select
  using (auth.uid() = user_id);
```

### 4. **Secrets Management**
- Never commit `.env.local`
- Use environment variables
- Service role key only on server
- Anon key safe for client

### 5. **Input Validation**
```typescript
// Always validate user input
const schema = z.object({
  email: z.string().email(),
  salary: z.number().positive(),
});
const data = schema.parse(body);
```

---

## Performance Optimization

### 1. **Database**
- ✅ Indexes on frequently queried columns
- ✅ Pagination for large result sets
- ✅ Connection pooling via Supabase

### 2. **API**
- ✅ Caching with headers
- ✅ Compression (gzip)
- ✅ Edge functions (Vercel)

### 3. **Frontend**
- ✅ Code splitting (Next.js automatic)
- ✅ Image optimization
- ✅ Lazy loading components
- ✅ CSS-in-JS minimal footprint

### 4. **Monitoring**
- ✅ Vercel analytics
- ✅ Database query logs
- ✅ Error tracking (Sentry)

---

## Deployment Architecture

### Development
```
Local Machine
    ↓
npm run dev
    ↓
http://localhost:3000
```

### Production (Recommended: Vercel)
```
GitHub Repository
    ↓
git push
    ↓
Vercel builds & deploys
    ↓
https://yourdomain.com
    ↓
Serverless functions + CDN
    ↓
PostgreSQL (Supabase)
```

### Alternative: Self-Hosted
```
Your Server (Docker)
    ↓
npm run build
npm run start
    ↓
http://your-ip:3000
    ↓
Nginx (reverse proxy)
    ↓
PostgreSQL (self-managed or Supabase)
```

---

## Scalability Plan

### Current (MVP)
- Single database instance
- Serverless functions
- CDN for static assets
- RLS for multi-tenancy

### Future (Scale)
- Database read replicas
- Redis caching layer
- Message queue (webhooks, exports)
- Search indexing (Elasticsearch)
- Separate reporting database

---

## Testing Strategy

### Unit Tests
- Business logic (payroll calculations)
- Utilities (formatting, validation)

### Integration Tests
- API endpoints
- Database queries
- Auth flows

### E2E Tests
- Complete user journeys
- Cross-browser testing

---

## Monitoring & Logging

### Logs
- Application logs → Vercel or ELK
- Database logs → Supabase dashboard
- Error logs → Sentry

### Metrics
- Request latency
- Error rates
- User metrics (retention, signup flow)
- Database performance

---

## Summary

This architecture provides:
- ✅ **Security** - Auth, authorization, data isolation
- ✅ **Scalability** - Serverless, multi-tenant
- ✅ **Maintainability** - TypeScript, modular structure
- ✅ **Performance** - Optimization at every layer
- ✅ **Developer Experience** - Modern tools, clear patterns

The focus is on **simplicity first, scaling second**.

---

*Last Updated: April 2026*
