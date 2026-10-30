import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "https://ialksng.me,https://www.ialksng.me,http://localhost:5173,http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".ialksng.me")
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for subpath proxies
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Normalize any subpath prefix so /work/projects/chatflow/app/api/... becomes /api/...
app.use((req, _res, next) => {
  if (req.url) {
    req.url = req.url.replace(/^.*\/api(\/|$)/, "/api$1");
  }
  next();
});

// Auto-connect MongoDB on API requests
let dbPromise = null;
app.use(async (req, _res, next) => {
  if (req.url.startsWith("/api/")) {
    try {
      if (!dbPromise) {
        dbPromise = connectDB();
      }
      await dbPromise;
    } catch (err) {
      dbPromise = null;
      console.error("Auto DB connect error:", err.message);
    }
  }
  next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
