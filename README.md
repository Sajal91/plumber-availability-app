# Plumber Availability Tracker

Real-time plumber availability tracking platform with a single mobile app for admins and plumbers.

- **Backend:** Node.js + Express + MongoDB + Socket.io + JWT + OTP auth
- **Mobile:** Expo (React Native) — admins and plumbers both login via phone + OTP

## Project Structure

```
plumber-availability-app/
├── backend/          # Express API
└── mobile/           # Expo app (admin + plumber)
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/) running locally or MongoDB Atlas
- [Expo Go](https://expo.dev/go) on your phone
- Phone and computer on the **same Wi-Fi network** (for mobile testing)

---

## Backend Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env`:

```env
MONGO_URI=mongodb://localhost:27017/plumber-availability
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=5000
OTP_DEV_MODE=true
```

Set `OTP_DEV_MODE=true` during development to return the OTP in API responses and log it in the server console. Disable in production and integrate an SMS provider in `backend/src/services/otpService.js`.

### 3. Seed users

```bash
npm run seed
```

This creates:

| Role | Name | Phone |
|------|------|-------|
| Admin | Admin | 9999999999 |
| Plumber | John Plumber | 9876543210 |
| Plumber | Mike Plumber | 9876543211 |
| Plumber | Sarah Plumber | 9876543212 |

Users must be pre-created by an admin/seed — there is no self-registration.

### 4. Start the server

```bash
npm run dev
```

Server runs at `http://localhost:5000`.

---

## Mobile App

### 1. Install dependencies

```bash
cd mobile
npm install
```

### 2. Configure API URL

Set `EXPO_PUBLIC_API_END_POINT` in `mobile/.env`:

```env
EXPO_PUBLIC_API_END_POINT=http://192.168.1.100:5000
```

Use your computer's LAN IP (not `localhost`).

### 3. Start Expo

```bash
npm start
```

Scan the QR code with **Expo Go**.

### Login (admin & plumber)

1. Enter registered phone number
2. Send OTP → verify (check server console if `OTP_DEV_MODE=true`)
3. App opens the correct screen based on role:

| Role | Screen |
|------|--------|
| **Admin** | Plumber list with live status, stats, and **Call** buttons |
| **Plumber** | Own status only — Available, Working, or Offline |

Plumbers cannot see other plumbers. Admins see all plumbers but cannot update status.

---

## API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/send-otp` | No | — | Send OTP to registered phone |
| POST | `/api/auth/verify-otp` | No | — | Verify OTP → JWT |
| GET | `/api/users/me` | Yes | Any | Current user profile |
| GET | `/api/users/plumbers` | Yes | Admin | All plumbers with status |
| PUT | `/api/users/status` | Yes | Plumber | Update own status |

**Auth header:** `Authorization: Bearer <token>`

---

## Socket.io Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `plumbersList` | Server → Client | Full plumber list on connect |
| `statusUpdated` | Server → All | `{ user, plumbers }` on status change |

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
| "Phone number not registered" | Run `npm run seed` in backend |
| OTP not received | Check server console; enable `OTP_DEV_MODE=true` |
| Cannot reach server on mobile | Check `EXPO_PUBLIC_API_END_POINT`, same Wi-Fi, firewall |
