import express, { Express, Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middleware/errorHandler";
import { seedAdmin } from "./utils/seedAdmin";
import settingsRoutes from "./app/settings/routes";
import userRoutes from "./app/user/routes";
import shareRoutes from "./app/project/routes";
import purchaseRoutes from "./app/purchase/routes";
import uploadVideoRoutes from "./app/upload-video/route";
import uploadImageRoutes from "./app/upload-image/routes";
import walletRoutes from "./app/wallet/routes";
import withdrawalRoutes from "./app/withdrawal/routes";
import { eventRouter, notificationRouter } from "./app/event/routes";
import rankRoutes from "./app/rank/routes";
import networkRoutes from "./app/network/routes";
import certificateRoutes from "./app/certificate/routes";
import resetRoutes from "./app/reset/routes";
import investmentRoutes from "./app/investment/routes";
import dashboardRoutes from "./app/dashboard/routes";
import categoryRoutes from "./app/category/routes";
import ledgerRoutes from "./app/ledger/routes";
import noticeRoutes from "./app/notice/routes";
import transferRoutes from "./app/transfer/routes";
import expenseRoutes from "./app/expense/routes";
import achieversRoutes from "./app/achievers/routes";
import adminSalaryRoutes from "./app/admin-salary/routes";
import branchRoutes from "./app/branch/routes";
import otpRoutes from "./app/otp/routes";
import rewardTrackerRoutes from "./app/reward-tracker/routes";
import capitalRoutes from "./app/capital/routes";
import pendingCommissionRoutes from "./app/pending-commission/routes";
import { autoReleaseMonthlySalaries } from "./app/admin-salary/controller";
import { processMonthlySalaries } from "./app/rank/controller";
import { setSocketIO } from "./app/notice/controller";
import cron from "node-cron";

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const origins = [
  "http://localhost:3000",
  "https://delwar-mlm-client.vercel.app",
  "https://alaheebd.com",
  "https://www.alaheebd.com",
];
const io = new Server(httpServer, {
  cors: {
    origin: origins,
    credentials: true,
  },
});
setSocketIO(io);

const port = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI as string);
mongoose.connection.once("open", async () => {
  console.log("Connected to MongoDB");
  await seedAdmin();

  // ── Admin monthly salary auto-release cron ────────────────────────────────
  // Runs at 23:59 on the last day of every month.
  // "59 23 28-31 * *" + day-of-month check ensures last day only.
  cron.schedule("59 23 28-31 * *", async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    // Only execute on the actual last day of the month
    if (tomorrow.getDate() === 1) {
      await autoReleaseMonthlySalaries();
    }
  });
  console.log("[CRON] Monthly salary scheduler registered");

  // ── Rank salary auto-release cron ─────────────────────────────────────────
  // Runs at 23:59 on the last day of every month (same schedule).
  // Only fires for users who haven't already been paid manually by admin.
  cron.schedule("59 23 28-31 * *", async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (tomorrow.getDate() === 1) {
      console.log("[CRON] Running rank salary auto-release...");
      const released = await processMonthlySalaries();
      console.log(
        `[CRON] Rank salary auto-release done: ${released} users paid`
      );
    }
  });
  console.log("[CRON] Rank salary scheduler registered");
});

// Fix S-11: Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(bodyParser.json({ limit: "13mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "13mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: origins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.get("/", (_req: Request, res: Response) => res.send("MLM Server"));

app.use("/settings", settingsRoutes);
app.use("/user", userRoutes);
app.use("/share", shareRoutes);
app.use("/purchase", purchaseRoutes);
app.use("/upload-video", uploadVideoRoutes);
app.use("/upload-image", uploadImageRoutes);
app.use("/wallet", walletRoutes);
app.use("/withdrawal", withdrawalRoutes);
app.use("/event", eventRouter);
app.use("/notification", notificationRouter);
app.use("/rank", rankRoutes);
app.use("/network", networkRoutes);
app.use("/certificate", certificateRoutes);
app.use("/reset", resetRoutes);
app.use("/investment", investmentRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/category", categoryRoutes);
app.use("/ledger", ledgerRoutes);
app.use("/notice", noticeRoutes);
app.use("/transfer", transferRoutes);
app.use("/expense", expenseRoutes);
app.use("/achievers", achieversRoutes);
app.use("/admin-salary", adminSalaryRoutes);
app.use("/branch", branchRoutes);
app.use("/otp", otpRoutes);
app.use("/reward-tracker", rewardTrackerRoutes);
app.use("/capital", capitalRoutes);
app.use("/pending-commission", pendingCommissionRoutes);
app.use(errorHandler);

if (process.env.VERCEL !== "1") {
  httpServer.listen(port, () => console.log(`Server running on port ${port}`));
}

export default app;
