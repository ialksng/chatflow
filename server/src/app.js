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
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Normalize any subpath prefix so /work/projects/chatflow/app/api/... becomes /api/...
app.use((req, _res, next) => {
  // If Vercel rewrote with query parameter ?path=...
  if (req.query && req.query.path) {
    const rawPath = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path;
    req.url = `/api/${rawPath.replace(/^\/+/, "")}`;
  } else {
    // Check req.url or fallback to x-matched-path header when rewritten to /api/index.js
    let url = req.url || "/";
    const matchedPath = req.headers["x-matched-path"] || req.headers["x-now-route-matches"];
    if (url === "/api/index.js" || url.startsWith("/api/index.js") || url === "/api" || url === "/api/") {
      if (matchedPath && !matchedPath.includes("index.js")) {
        url = matchedPath;
      }
    }

    let cleanUrl = url
      .replace(/^.*\/work\/projects\/chatflow\/(app\/)?api\/?/, "/api/")
      .replace(/^\/chatflow-api\/?/, "/api/");

    if (!cleanUrl.startsWith("/api")) {
      cleanUrl = `/api${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
    }
    req.url = cleanUrl;
  }
  next();
});

// Auto-connect MongoDB on API requests
app.use(async (req, _res, next) => {
  if (req.url.startsWith("/api/")) {
    try {
      await connectDB();
    } catch (err) {
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

