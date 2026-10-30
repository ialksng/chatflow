# ChatFlow

A modern, full-stack real-time communication platform featuring 1-on-1 messaging, WebRTC audio/video calls, interactive collaborative whiteboard, AI assistant integration, and media sharing.

---

## 🌐 Live Deployments

- **Production App**: [https://ialksng.me/work/projects/chatflow/app](https://ialksng.me/work/projects/chatflow/app)
- **Vercel Direct Deployment**: [https://chatflow-ten-rho.vercel.app/work/projects/chatflow/app/signup](https://chatflow-ten-rho.vercel.app/work/projects/chatflow/app/signup)

---

## ✨ Features

- **Real-Time Messaging**: Built on Socket.IO for instant message delivery, online indicators, and typing states.
- **WebRTC Calling**: Peer-to-peer audio and video calls with screen-sharing capabilities.
- **Collaborative Whiteboard**: Real-time collaborative canvas drawing during calls.
- **AI Assistant Integration**: Integrated Indra AI conversational assistant.
- **Media Uploads**: Image sharing backed by Cloudinary.
- **Dual Persistence**: MongoDB for structured user data and Supabase for realtime event persistence and storage.
- **Subpath Hosting Ready**: Configured out-of-the-box to run seamlessly under subpaths (such as `/work/projects/chatflow/app`).

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, DaisyUI, Zustand, Lucide Icons, React Router v7
- **Backend**: Node.js, Express, Socket.IO, WebSockets (`ws`), Mongoose, Supabase Client, Cloudinary, JWT

---

## 🔑 Environment Variables

Copy the provided example files to create your local `.env` configuration:

```bash
# In project root
cp .env.example .env

# Or separately for client & server:
cp client/.env.example client/.env
cp server/.env.example server/.env
```

### 1. Client (Frontend - Vite)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_BASE_PATH` | No | `/work/projects/chatflow/app/` | Base URL path where the frontend app is hosted. |
| `VITE_API_URL` | No | `/chatflow-api` | Base URL for REST API calls. Proxied to backend in production via `vercel.json`. |
| `VITE_SOCKET_URL` | No | `https://chatflow.ialksng.me` | WebSocket / Socket.IO server endpoint for real-time chat and signaling. |

### 2. Server (Backend - Node.js)

| Variable | Required | Example | Description |
|---|---|---|---|
| `PORT` | No | `5002` | Port on which the unified backend server listens. |
| `NODE_ENV` | No | `production` / `development` | Node environment mode. |
| `CLIENT_URL` | Yes | `https://ialksng.me` | Allowed CORS origin for the frontend application. |
| `MONGODB_URI` | Yes | `mongodb+srv://...` | Connection URI for the MongoDB database cluster. |
| `SUPABASE_URL` | Yes | `https://<id>.supabase.co` | Supabase project URL for realtime data sync. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `eyJhbGci...` | Supabase service role secret key. |
| `SUPABASE_JWT_SECRET` | Yes | `your_secret` | Secret used to verify Supabase JWT tokens. |
| `JWT_SECRET` | Yes | `your_jwt_secret` | Secret key used for signing session auth cookies. |
| `CLOUDINARY_NAME` | Yes | `your_cloud_name` | Cloudinary account cloud name. |
| `CLOUDINARY_API_KEY` | Yes | `your_api_key` | Cloudinary API key for uploading media. |
| `CLOUDINARY_API_SECRET` | Yes | `your_api_secret` | Cloudinary API secret for signing uploads. |

---

## 🚀 Local Development

### Prerequisites

- Node.js (>= 18.0.0)
- npm

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/ialksng/chatflow.git
cd chatflow

# Install client dependencies
npm --prefix client install

# Install server dependencies
npm --prefix server install
```

### 2. Run the Development Servers

```bash
# Terminal 1 - Backend Server (Port 5002)
cd server
npm run dev

# Terminal 2 - Frontend Client (Port 5173)
cd client
npm run dev
```

---

## ☁️ Deployment

### Frontend (Vercel)

This repository includes a [`vercel.json`](./vercel.json) configuration that allows you to import and host the frontend on Vercel:

1. Import the repository in [Vercel](https://vercel.com).
2. Keep the **Root Directory** as `./`.
3. Vercel automatically runs `cd client && npm install && npm run build` and serves static files from `client/dist`.
4. The router serves from `/work/projects/chatflow/app` with client-side SPA routing and API reverse-proxying.

### Backend Server

Because WebSockets and persistent Socket.IO connections require a long-running Node.js process, host the `server/` directory on a platform that supports persistent servers (VPS, Railway, Render, Fly.io, or DigitalOcean) and point `VITE_SOCKET_URL` to it.

---

## 📄 License

This project is licensed under the ISC License. See the [LICENSE](./LICENSE) file for details.
