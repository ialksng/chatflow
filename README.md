# 💬 ChatFlow

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-black.svg)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)

A modern, full-stack, real-time communication platform featuring 1-on-1 instant messaging, high-performance Groq AI conversational assistant with KaTeX math rendering, WebRTC audio/video calls with Twilio STUN/TURN traversal, interactive whiteboard drawing, and multi-device presence.

---

## 🌐 Live Deployments

- **Live Application**: [https://ialksng.me/work/projects/chatflow/app](https://ialksng.me/work/projects/chatflow/app)
- **Vercel Production Mirror**: [https://chatflow-ten-rho.vercel.app](https://chatflow-ten-rho.vercel.app)
- **Developer Website**: [https://ialksng.me](https://ialksng.me)

---

## ✨ Features

### 💬 Real-Time Messaging & Chat
- **Instant Messaging**: Powered by Socket.IO with optimistic UI updates.
- **Message Actions**:
  - **Inline Message Editing**: Edit sent messages with live sync across participants.
  - **Emoji Reactions**: React with multiple emojis (`👍`, `❤️`, `😂`, `😮`, `😢`) with instant counts.
  - **Message Deletion**: Soft deletion of messages.
  - **Thread Replies**: Contextual quote-reply to specific messages.
- **Media Attachments**: Image uploads powered by Cloudinary with automatic MongoDB base64 fallback.

### 🤖 AI Assistant (Groq Cloud)
- **Conversational Intelligence**: Integrated ultra-fast Groq LLM inference with an automated model fallback cascade (`openai/gpt-oss-120b` $\rightarrow$ `llama-3.3-70b-versatile` $\rightarrow$ `llama-3.1-8b-instant`).
- **LaTeX Math Rendering**: Math formatting for formulas using `KaTeX`, `remark-math`, and `rehype-katex` ($inline$ and $$display$$).
- **GFM Tables**: Responsive GitHub Flavored Markdown table styling.
- **Code Blocks**: Formatted syntax blocks with language badge and one-click **Copy Code** button.
- **Streamlined Controls**: Call, video, and draw action buttons are cleanly hidden when chatting with the AI Assistant.

### 📞 WebRTC Audio & Video Calls
- **Cross-Network Connectivity**: Powered by Twilio Network Traversal (STUN/TURN) for seamless peer-to-peer connection across restrictive NATs and firewalls.
- **Multi-Device Signaling**: Socket-based offer/answer and ICE candidate exchange that broadcasts across all open devices of a user.
- **Screen Sharing**: One-click screen broadcasting during video sessions.
- **Resilient Media Streams**: Audio and dummy track fallbacks to prevent crashes when devices lack camera or microphone access.

### 🎨 Collaborative Whiteboard
- **Real-Time Drawing**: Synchronized multi-user canvas drawing during calls.
- **Canvas Tools**: Multi-color palette (White, Blue, Green, Yellow, Red), adjustable brush widths, eraser, and synchronized board clearing.
- **Cross-Device Coordinate Normalization**: Normalized 1000×1000 coordinate map providing pixel-accurate drawing between mobile touchscreens and desktop mice.
- **Standalone Mode**: Dedicated whiteboard sessions without requiring camera/microphone access.

### 🛡️ Authentication & User Presence
- **Multi-Mode Authentication**:
  - Email & Password with secure `bcryptjs` hashing.
  - **Google OAuth 2.0**: One-click sign-in via Google Identity Services.
  - **Password Recovery**: Secure forgot password and reset password workflow via timed crypto tokens.
- **Hybrid Real-Time Presence**:
  - Real-time Socket.IO connection status.
  - MongoDB database-backed `lastSeen` tracking ensuring active users stay displayed as "Online" across serverless and server environments.
  - Silent background contact refresh without UI flickering.

---

## 🛠️ Tech Stack & Architecture

### Frontend
- **Framework**: React 19, Vite
- **Styling**: Tailwind CSS v4, DaisyUI 5
- **State Management**: Zustand
- **Real-time Client**: Socket.IO Client
- **Routing**: React Router v7 (configured for subpath hosting at `/work/projects/chatflow/app`)
- **Markdown & Math**: `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `KaTeX`
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

### Backend
- **Runtime**: Node.js (>= 18.0.0, ES Modules)
- **Web Framework**: Express 5
- **Database & ODM**: MongoDB Atlas, Mongoose
- **Real-time Engine**: Socket.IO with multi-socket Map architecture
- **Security**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cookie-parser`, `cors`

---

## 🔌 Third-Party APIs & Services Used

| Service | Purpose | Configuration |
| :--- | :--- | :--- |
| **Email Service (SMTP / Gmail)** | Automated password reset emails with timed verification tokens | `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `EMAIL_REPLY_TO` |
| **Groq Cloud API** | Ultra-low latency LLM inference for AI Assistant | `GROQ_API_KEY`, `GROQ_MODEL` |
| **Twilio Network Traversal** | Dynamic STUN/TURN ICE servers for cross-network WebRTC | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |
| **Google OAuth 2.0** | Single Sign-On (SSO) authentication | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Cloudinary** | Cloud image storage and asset optimization | `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_SECRET` |
| **MongoDB Atlas** | Cloud database for user profiles, messages, and state | `MONGODB_URI` |
| **Vercel** | Edge hosting, client bundle distribution, and unified serverless API | Hosted at `chatflow-ten-rho.vercel.app` |

---

## 🔑 Environment Variables

### Root / Server Environment (`server/.env` or root `.env`)

```env
# Server Configuration
PORT=5002
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,https://ialksng.me,https://chatflow-ten-rho.vercel.app

# Database & Authentication
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/chatflow?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here

# Email Delivery (Password Reset)
EMAIL_USER=ialksng@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=Alok Singh <no-reply@ialksng.me>
EMAIL_REPLY_TO=no-reply@ialksng.me

# Groq AI Assistant
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b

# Twilio (WebRTC TURN Traversal)
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5002/api/auth/google/callback

# Cloudinary Media (Optional - has automatic MongoDB base64 fallback)
CLOUDINARY_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET=your_cloudinary_api_secret
```

### Client Environment (`client/.env`)

```env
# Application Base Routing
VITE_BASE_PATH=/
VITE_API_URL=http://localhost:5002/api

# Real-time WebSocket Server
VITE_SOCKET_URL=http://localhost:5002

# Google Sign-In Client ID (Optional)
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
VITE_GOOGLE_CALLBACK_URL=http://localhost:5002/api/auth/google/callback
```

---

## 🚀 How to Run Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or higher)
- [npm](https://www.npmjs.com/)
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster or local MongoDB instance

### 1. Clone the Repository
```bash
git clone https://github.com/ialksng/chatflow.git
cd chatflow
```

### 2. Install Dependencies
This project uses npm workspaces to manage both client and server packages from the root:

```bash
# Install all root, client, and server dependencies
npm install
```

### 3. Setup Environment Variables
Create your configuration files:
```bash
# In client/
cp client/.env.example client/.env

# In server/
cp server/.env.example server/.env
```
*(Fill in your `MONGODB_URI`, `JWT_SECRET`, and optional API keys in `server/.env`).*

### 4. Run the Development Servers

You can run both client and server in separate terminal windows:

#### Terminal 1 — Backend Server
```bash
cd server
npm run dev
```
*The unified Express & Socket.IO server will start on `http://localhost:5002`.*

#### Terminal 2 — Frontend Client
```bash
cd client
npm run dev
```
*The Vite frontend will spin up on `http://localhost:5173`.*

---

## 📦 Production Deployment

### 1. Frontend & Serverless Deployment (Vercel)
The repository contains a [`vercel.json`](./vercel.json) pre-configured with rewrites for subpath hosting (`/work/projects/chatflow/app`):
1. Connect the GitHub repository to **Vercel**.
2. Configure your Environment Variables (`MONGODB_URI`, `JWT_SECRET`, `GROQ_API_KEY`, `VITE_SOCKET_URL`).
3. Deploy. Vercel automatically runs `npm run build` and distributes the optimized client bundle.

### 2. Real-Time Socket Server (Persistent Host)
Because WebSocket signaling and WebRTC coordination require a persistent Node.js event loop:
1. Create a new service on your persistent host (Railway, Render, Fly.io, or VPS).
2. Set:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. Add your environment variables (`MONGODB_URI`, `JWT_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `CLIENT_URL`).
4. Once deployed, set your service URL as `VITE_SOCKET_URL` in your frontend environment.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

Copyright (c) 2026 **Alok Singh**
