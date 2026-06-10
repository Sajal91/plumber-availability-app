# Plumber Availability Tracker

Real-time plumber availability tracking platform — MVP for client demo.

- **Backend:** Node.js + Express + MongoDB + Socket.io + JWT
- **Mobile:** Expo (React Native) with Expo Go support

## Project Structure

```
plumber-availability-app/
├── backend/          # Express API server
└── mobile/           # Expo React Native app
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/) running locally or a MongoDB Atlas connection string
- [Expo Go](https://expo.dev/go) app on your physical phone (iOS/Android)
- Phone and computer on the **same Wi-Fi network**

---

## Backend Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` (or edit the existing `.env`):

```env
MONGO_URI=mongodb://localhost:27017/plumber-availability
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=5000
```

For MongoDB Atlas, use your Atlas connection string as `MONGO_URI`.

### 3. Start the server

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

Server runs at `http://0.0.0.0:5000`. Verify with:

```bash
curl http://localhost:5000/api/health
```

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register (name, phoneNumber, password) |
| POST | `/api/auth/login` | No | Login (phoneNumber, password) → JWT |
| GET | `/api/users/all` | Yes | Get all users with status |
| PUT | `/api/users/status` | Yes | Update status (`available`, `working`, `offline`) |

**Auth header:** `Authorization: Bearer <token>`

### Socket.io Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `usersList` | Server → Client | Full user list on connect |
| `statusUpdated` | Server → All Clients | `{ user, users }` on status change |

---

## Mobile App Setup

### 1. Install dependencies

```bash
cd mobile
npm install
```

### 2. Configure API URL

Edit `mobile/src/config/config.js` and set `API_END_POINT` to your computer's LAN IP:

```js
const API_END_POINT = '192.168.1.100'; // your machine's IP
```

**Find your IP:**
- **Windows:** `ipconfig` → look for IPv4 Address under your Wi-Fi adapter
- **Mac:** `ifconfig en0 | grep inet`
- **Linux:** `ip addr` or `hostname -I`

### 3. Start Expo

```bash
npm start
```

Scan the QR code with **Expo Go** on your phone.

> **Tip:** If the app can't connect, ensure Windows Firewall allows inbound connections on port 5000, and that both devices are on the same network.

---

## Demo Flow

1. Start MongoDB and the backend server
2. Update `API_END_POINT` in the mobile config
3. Start Expo and open the app on your phone
4. Register 2+ plumber accounts (use different phones or register/logout)
5. On the dashboard, tap **Available** or **Working** — all connected clients see updates instantly
6. Tap **Call** on any plumber to open the native phone dialer

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
| "Cannot reach server" on mobile | Check `API_END_POINT`, backend running, same Wi-Fi, firewall |
| MongoDB connection error | Ensure MongoDB is running; verify `MONGO_URI` |
| Socket not updating | Confirm backend is on `0.0.0.0`, not `localhost` only |
| 401 Unauthorized | Token expired (7 days) — log in again |
