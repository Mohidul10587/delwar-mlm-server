import express, { Express, Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://delwar-mlm-client.vercel.app"],
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
app.use(errorHandler);

if (process.env.VERCEL !== "1") {
  httpServer.listen(port, () => console.log(`Server running on port ${port}`));
}

export default app;
