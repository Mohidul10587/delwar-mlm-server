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
import shareRoutes from "./app/share/routes";
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
import { setSocketIO } from "./app/notice/controller";

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://delwar-mlm-client.vercel.app"],
    credentials: true,
  },
});
setSocketIO(io);

const port = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI as string);
mongoose.connection.once("open", async () => {
  console.log("Connected to MongoDB");
  await seedAdmin();
});

// Fix S-11: Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://delwar-mlm-client.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// Fix S-06: Rate limiting
const isDev = process.env.NODE_ENV !== "production";

// General API rate limit — relaxed in dev to avoid hitting limits during hot reload
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
});

// Strict limit for auth endpoints — 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" },
});

// Financial action limit — 30 requests per 15 minutes per IP
const financialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many financial requests, please try again later" },
});

// app.use(generalLimiter);
// app.use("/user/login", authLimiter);
// app.use("/user/register", authLimiter);
// app.use("/user/refresh", authLimiter);
// app.use("/purchase", financialLimiter);
// app.use("/withdrawal", financialLimiter);
// app.use("/transfer", financialLimiter);
// app.use("/investment", financialLimiter);

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
app.use(errorHandler);

if (process.env.VERCEL !== "1") {
  httpServer.listen(port, () => console.log(`Server running on port ${port}`));
}

export default app;
