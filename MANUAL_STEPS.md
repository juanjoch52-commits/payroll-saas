# MyJova — Manual setup steps for Juan

This sprint added a lot of capability. The code is ready, but a few things
require **you** to create accounts and paste API keys. Do them in this order.
After each, the corresponding feature will turn from a fallback / placeholder
into a fully working integration.

> Tip: keep a single `.env.local` file in the project root. Use `.env.example` as
> a template — every key has a comment with its origin URL.

---

## 1. Supabase (REQUIRED)

Without this, nothing in the app that touches the database works.

1. Go to <https://supabase.com/dashboard> and **Create new project**.
2. Pick a strong DB password and store it in your password manager.
3. When the project is ready, go to **Settings → API**:
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose)
4. Apply the migrations: in the project root, run
   ```bash
   npx supabase link --project-ref <your-ref>
   npm run db:push
   npm run db:types   # optional — regenerates strict types
   ```
5. **Auth → Hooks → Custom Access Token Hook**: enable `public.custom_access_token_hook`.
6. **Database → Replication**: enable Realtime on the `notifications` table (otherwise the bell won't get live updates).
7. **Auth → URL Configuration**: add your domain (production) and `http://localhost:3000` (dev).
8. After your first signup, in **SQL Editor** run:
   ```sql
   insert into platform_admins (user_id, granted_by, notes)
   values ('<your-auth-users-id>', '<your-auth-users-id>', 'Founder');
   ```
   This unlocks `/admin/*` for you.

---

## 2. Mapbox (REQUIRED for maps)

1. Create a free account at <https://account.mapbox.com>.
2. Copy your **Default public token** (starts with `pk.`) to `NEXT_PUBLIC_MAPBOX_TOKEN`.
3. Free tier covers 50k map loads/month — way more than you'll use early on.

Until this key is set, every map shows a friendly "Mapbox token not configured" placeholder.

---

## 3. Stripe (REQUIRED for billing)

1. Create an account at <https://stripe.com> (use test mode first).
2. In **Developers → API keys**:
   - Publishable → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret → `STRIPE_SECRET_KEY`
3. In **Products**, create 3 products with **TWO recurring monthly prices each**
   (billing model: base + per-active-worker; current placeholder amounts —
   adjust freely, but keep them in sync with `supabase/migrations/*seat_pricing.sql`
   and `src/lib/pricing/plans.ts`):
   - Esencial: flat $29 → `STRIPE_PRICE_ESSENTIAL_BASE` · per-unit $5 → `STRIPE_PRICE_ESSENTIAL_SEAT`
   - Avanzado: flat $59 → `STRIPE_PRICE_ADVANCED_BASE` · per-unit $7 → `STRIPE_PRICE_ADVANCED_SEAT`
   - Premium: flat $99 → `STRIPE_PRICE_PREMIUM_BASE` · per-unit $10 → `STRIPE_PRICE_PREMIUM_SEAT`

   The per-unit ("seat") price must be a **standard licensed price** (not metered):
   the app updates the subscription item quantity itself whenever workers are
   added/terminated, and reconciles on every visit to `/billing`.
4. **Developers → Webhooks → Add endpoint** pointing to `https://<your-domain>/api/webhooks/stripe`.
   Copy the Signing Secret → `STRIPE_WEBHOOK_SECRET`.

---

## 4. Resend (REQUIRED for transactional email)

1. Sign up at <https://resend.com> (free: 100/day, $20/mo for 50k).
2. **API Keys → Create API key** → copy to `RESEND_API_KEY`.
3. **Domains → Add Domain** → `myjova.com`, add the DNS records to your registrar.
4. Update `RESEND_FROM_EMAIL=noreply@myjova.com` once verified.

Without this, `dispatch()` logs would-be emails to the server console and skips delivery.

---

## 5. Twilio (OPTIONAL — SMS alerts)

Only needed if you want SMS for critical alerts (payroll failed, security).

1. Trial account at <https://www.twilio.com>.
2. Get a phone number (free trial credit covers a US number).
3. Copy from console:
   - Account SID → `TWILIO_ACCOUNT_SID`
   - Auth Token → `TWILIO_AUTH_TOKEN`
   - Your number → `TWILIO_FROM_NUMBER` (E.164 format, e.g. `+15551234567`)

Cost: ~$0.0079/SMS in the US.

---

## 6. VAPID keys for Web Push (OPTIONAL)

1. In your terminal:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Copy the **publicKey** → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
3. Copy the **privateKey** → `VAPID_PRIVATE_KEY`
4. Leave `VAPID_SUBJECT=mailto:support@myjova.com` (or your real address).

That's it — no external service. The browser handles the push delivery to each user's device.

---

## 7. Track1099 (OPTIONAL — e-filing)

Skip if you'd rather upload 1099-NEC PDFs to IRS manually.

1. Register at <https://www.track1099.com>.
2. Generate an API key from your account settings → `TRACK1099_API_KEY`.
3. Without this, `submit1099Batch()` returns a deterministic mock ID so the wizard UI is exercisable.

---

## 8. IRS FIRE TCC (PRODUCTION ONLY)

Only needed if you want to file 1099s **directly to IRS** rather than through Track1099.

1. Apply for a **TCC** at <https://www.irs.gov/e-file-providers/filing-information-returns-electronically-fire>. Takes ~45 days for IRS approval.
2. Copy TCC → `IRS_FIRE_TCC`, PIN → `IRS_FIRE_PIN`.
3. Even then, automated upload via SFTP isn't built yet — the code generates the Pub 1220 TXT file for you to upload manually.

---

## 9. Playwright (DEV ONLY — visual QA)

One-time install of the browser binaries:
```bash
npx playwright install chromium
```

Then run the suite:
```bash
npm run dev        # in one terminal
npx playwright test  # in another — generates screenshots in tests/screenshots/
```

---

## 10. Deploy to Vercel

After all the above:

```bash
npm install -g vercel
vercel link
# Add each env var from .env.local
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_MAPBOX_TOKEN
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PRICE_ESSENTIAL_BASE
vercel env add STRIPE_PRICE_ESSENTIAL_SEAT
vercel env add STRIPE_PRICE_ADVANCED_BASE
vercel env add STRIPE_PRICE_ADVANCED_SEAT
vercel env add STRIPE_PRICE_PREMIUM_BASE
vercel env add STRIPE_PRICE_PREMIUM_SEAT
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM_EMAIL
vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY
vercel env add VAPID_PRIVATE_KEY
vercel env add VAPID_SUBJECT
# optional
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_FROM_NUMBER
vercel env add TRACK1099_API_KEY

vercel --prod
```

Don't forget:
- Add custom domain in Vercel dashboard
- Update Supabase Auth redirect URLs to the prod domain
- Update Stripe webhook endpoint to the prod URL

---

## Checklist quick-glance

- [ ] Supabase project created + migrations applied + Realtime on
- [ ] Platform admin row inserted for your user
- [ ] Mapbox token set
- [ ] Stripe products + webhook configured
- [ ] Resend domain verified
- [ ] (Optional) Twilio number + auth
- [ ] (Optional) VAPID keys generated
- [ ] (Optional) Track1099 / IRS FIRE
- [ ] Playwright browsers installed (for visual QA)
- [ ] Vercel env vars added + first deploy
