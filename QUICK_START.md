# 🚀 Quick Start Guide

## Setup in 5 Minutes

### Step 1: Prerequisites
Make sure you have:
- Node.js 18+ installed
- npm or yarn
- A Supabase account (free tier works)

### Step 2: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Create a new project (select USA region for US tax features)
3. Go to **Settings → API** and copy:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Anon Key)
   - `SUPABASE_SERVICE_ROLE_KEY` (Service Role Secret)

### Step 3: Clone & Install

```bash
# Clone the project
git clone <your-repo-url>
cd payroll-saas

# Install dependencies
npm install
```

### Step 4: Configure Environment

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your Supabase keys
nano .env.local
# or use your favorite editor

# Should look like:
# NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
# SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

### Step 5: Setup Database

```bash
# Create tables and enable Row Level Security
npm run db:push

# (Optional) Seed with test data
npm run db:seed
```

### Step 6: Start Development Server

```bash
npm run dev
```

Visit: **[http://localhost:3000](http://localhost:3000)**

## 🎯 What's Included

✅ **Authentication** - Secure login with Supabase Auth
✅ **Employee Management** - Add, edit, delete employees
✅ **Payroll Engine** - Auto-calculate federal taxes (2024 rates)
✅ **Responsive Design** - Works on desktop and mobile
✅ **Multi-language** - English and Spanish support
✅ **Row Level Security** - Enterprise-grade security

## 📝 First Steps as a User

1. **Sign Up** - Create an account and company
2. **Add Employees** - Add your team members
3. **Create Payroll** - Set pay periods and calculate payroll
4. **View Reports** - Check payroll summaries and totals

## 🛠️ Key Files to Know

| File | Purpose |
|------|---------|
| `src/app/api/` | Backend API endpoints |
| `src/components/` | React UI components |
| `src/lib/payroll-calculations.ts` | Tax & payroll math |
| `supabase/migrations/` | Database schema |
| `.env.local` | Your secrets (never commit!) |

## 📊 Database Schema Quick Overview

```
companies
├── employees
│   └── payroll_items (in payroll_runs)
├── payroll_runs
│   └── payroll_items
└── company_users
```

## 🔐 Security Notes

- Never commit `.env.local` to Git
- Use Supabase Row Level Security (RLS) for multi-tenant safety
- All user data is automatically filtered by company
- Keep service role key safe (never expose in frontend)

## 🐛 Troubleshooting

### "Unauthorized" error on login
→ Check that Supabase auth is configured correctly

### Database tables don't exist
→ Run `npm run db:push` to create tables

### Port 3000 already in use
```bash
lsof -ti :3000 | xargs kill -9
npm run dev
```

### TypeScript errors
```bash
npm run build
# Fix any errors before continuing
```

## 📚 Next Steps

1. **Read the docs:**
   - [DEVELOPMENT.md](./DEVELOPMENT.md) - Full development guide
   - [docs/API.md](./docs/API.md) - API endpoints

2. **Customize:**
   - Add your company logo in `public/`
   - Update colors in `tailwind.config.ts`
   - Modify tax rates in `src/lib/payroll-calculations.ts`

3. **Deploy:**
   - Vercel: `git push` to auto-deploy
   - See [DEPLOYMENT.md](./DEPLOYMENT.md) for details

## 💡 Pro Tips

### Test Tax Calculations

```bash
# Open Node REPL
node

# Inside REPL:
const { calculateTaxWithholdings } = require('./dist/lib/payroll-calculations');
const taxes = calculateTaxWithholdings({
  grossPay: 2000,
  payFrequency: 'biweekly',
  filingStatus: 'single',
  allowances: 0
});
console.log(taxes);
```

### Monitor Database

Open Supabase Dashboard → SQL Editor → View recent queries

### Add a Test Employee

Use Supabase Dashboard → Table Editor → Insert test data

## ❓ FAQs

**Q: Do I need to pay for Supabase?**  
A: No! Free tier supports 500MB database and 2GB bandwidth. Perfect for MVP.

**Q: Is this GDPR compliant?**  
A: Supabase handles GDPR. Enable backups and follow data residency rules.

**Q: How do I update tax rates for 2025?**  
A: Edit `TAX_BRACKETS_2024` in `src/lib/payroll-calculations.ts`

**Q: Can I add state-specific taxes?**  
A: Yes! Add state logic to `calculateTaxWithholdings()` function.

---

**Need help?** 
- Check [DEVELOPMENT.md](./DEVELOPMENT.md)
- Review [GitHub Issues](https://github.com/yourrepo/issues)
- Email: support@payrollhub.io

Happy building! 🎉
