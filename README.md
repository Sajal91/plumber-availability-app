# Plumber Availability Tracker

Real-time plumber availability tracking with a single Expo app for admins and plumbers.

- **Backend:** Supabase (Postgres + Auth Phone OTP + RLS + Realtime + Edge Functions)
- **Mobile:** Expo (React Native) — admins and plumbers both login via phone + OTP

## Project Structure

```
plumber-availability-app/
├── mobile/                 # Expo app (admin + plumber)
├── supabase/
│   ├── functions/          # Edge Functions (OTP gate + admin user mgmt)
│   └── migrations/         # SQL migrations (reference)
└── scripts/                # Seed Auth users + profiles
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Supabase](https://supabase.com/) project
- Phone Auth enabled in Supabase (Twilio or MessageBird SMS provider)
- [Expo Go](https://expo.dev/go) on your phone

---

## Supabase Setup

### 1. Enable Phone Auth

In the Supabase Dashboard:

1. **Authentication → Providers → Phone** — enable Phone
2. Configure Twilio (or MessageBird) credentials
3. Optionally add test phone numbers for local development

### 2. Schema

Migrations are applied to the linked project (`profiles` table, RLS, Realtime, `is_phone_registered` RPC).

Reference SQL lives in [`supabase/migrations`](supabase/migrations).

### 3. Edge Functions

| Function | Purpose | JWT |
|----------|---------|-----|
| `request-otp` | Invite-only gate before `signInWithOtp` | Off (pre-login) |
| `manage-users` | Admin add/remove plumbers (Auth + profile) | On (admin session) |

Admins can add or remove plumbers from the Admin Panel. Only users who exist in Auth + `profiles` can log in.

### 4. Seed users

```bash
npm install
cp scripts/.env.example scripts/.env
# set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
set -a && source scripts/.env && set +a   # or export vars in your shell
npm run seed
```

On Windows PowerShell:

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
npm run seed
```

Seed accounts (E.164 / local 10-digit):

| Role | Name | Phone |
|------|------|-------|
| Admin | Admin | +919999999999 (`9999999999`) |
| Plumber | John Plumber | +919876543210 |
| Plumber | Mike Plumber | +919876543211 |
| Plumber | Sarah Plumber | +919876543212 |

Users must be pre-created — there is no self-registration.

---

## Mobile App

### 1. Install dependencies

```bash
cd mobile
npm install
```

### 2. Configure env

Copy `.env.example` to `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 3. Start Expo

```bash
npm start
```

Scan the QR code with **Expo Go**.

### Login (admin & plumber)

1. Enter registered phone number (10-digit local or `+91…`)
2. Send OTP → verify SMS code
3. App opens the correct screen based on role:

| Role | Screen |
|------|--------|
| **Admin** | Plumber list with live status, stats, **Add** / **Remove**, and **Call** |
| **Plumber** | Own status only — Available, Working, or Offline |

Plumbers cannot see other plumbers. Admins manage who can log in (add/remove plumbers) but cannot update plumber status.

---

## Data & Auth model

| Concern | Implementation |
|---------|----------------|
| Users | `auth.users` (phone) + `public.profiles` |
| Invite-only | Edge Function `request-otp` + profile must exist after verify |
| Admin user management | Edge Function `manage-users` (create/delete Auth + profile) |
| Admin list / plumber status | PostgREST + RLS |
| Live updates | Supabase Realtime `postgres_changes` on `profiles` |

### Profile fields

- `role`: `admin` | `plumber`
- `status`: `available` | `working` | `offline`

---

## Status Colors

| Status | Color |
|--------|-------|
| Available | Green |
| Working | Orange |
| Offline | Gray |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Phone number not registered" | Add the user from Admin Panel (or run `npm run seed`) |
| OTP not received | Enable Phone Auth + Twilio in Supabase Dashboard; check SMS logs |
| Cannot reach Supabase | Check `EXPO_PUBLIC_SUPABASE_URL` / anon key and device network |
| Profile missing after OTP | User exists in Auth but not in `profiles` — re-run seed |
