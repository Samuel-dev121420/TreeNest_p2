import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { apiRouter } from "./routes/index.js";
import { initializeFirebaseAdmin } from "./config/firebase-admin.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";

// Initialize Firebase Admin
initializeFirebaseAdmin();

// Middleware
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get("/", (req, res) => {
  res.json({
    message: "🌳 TreeNest Backend Server is active!",
    version: "1.0.0",
    docs: "/api/health",
  });
});

// API Routes
app.use("/api", apiRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 TreeNest Backend running on http://localhost:${PORT}`);
  console.log(`🌿 Health check at http://localhost:${PORT}/api/health`);
});

export default app;
