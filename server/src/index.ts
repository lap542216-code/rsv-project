import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import menuRouter from "./routes/menu.js";
import shopStatusRouter from "./routes/shopStatus.js";
import ordersRouter from "./routes/orders.js";
import ownerRouter from "./routes/owner.js";
import { startCronJobs } from "./cron.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

// ---------- Middleware ----------
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile/curl) or any localhost origin during development
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || origin === process.env.FRONTEND_URL) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ---------- Routes ----------
app.use("/api/menu", menuRouter);
app.use("/api/shop-status", shopStatusRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/owner", ownerRouter);

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true, timestamp: new Date() }));

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`🚀 MSV Catering API running at http://localhost:${PORT}`);
  startCronJobs();
});

export default app;
