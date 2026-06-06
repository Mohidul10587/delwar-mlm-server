"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const errorHandler_1 = require("./middleware/errorHandler");
const seedAdmin_1 = require("./utils/seedAdmin");
const routes_1 = __importDefault(require("./app/settings/routes"));
const routes_2 = __importDefault(require("./app/user/routes"));
const routes_3 = __importDefault(require("./app/share/routes"));
const routes_4 = __importDefault(require("./app/purchase/routes"));
const route_1 = __importDefault(require("./app/upload-video/route"));
const routes_5 = __importDefault(require("./app/upload-image/routes"));
const routes_6 = __importDefault(require("./app/wallet/routes"));
const routes_7 = __importDefault(require("./app/withdrawal/routes"));
const routes_8 = require("./app/event/routes");
const routes_9 = __importDefault(require("./app/rank/routes"));
const routes_10 = __importDefault(require("./app/network/routes"));
const routes_11 = __importDefault(require("./app/commission/routes"));
const routes_12 = __importDefault(require("./app/certificate/routes"));
const routes_13 = __importDefault(require("./app/reset/routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
mongoose_1.default.connect(process.env.MONGODB_URI);
mongoose_1.default.connection.once("open", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Connected to MongoDB");
    yield (0, seedAdmin_1.seedAdmin)();
}));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: ["http://localhost:3000", "https://share-mlm-client.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
}));
app.get("/", (_req, res) => res.send("MLM Server"));
app.use("/settings", routes_1.default);
app.use("/user", routes_2.default);
app.use("/share", routes_3.default);
app.use("/purchase", routes_4.default);
app.use("/upload-video", route_1.default);
app.use("/upload-image", routes_5.default);
app.use("/wallet", routes_6.default);
app.use("/withdrawal", routes_7.default);
app.use("/event", routes_8.eventRouter);
app.use("/notification", routes_8.notificationRouter);
app.use("/rank", routes_9.default);
app.use("/network", routes_10.default);
app.use("/commission", routes_11.default);
app.use("/certificate", routes_12.default);
app.use("/reset", routes_13.default);
app.use(errorHandler_1.errorHandler);
if (process.env.VERCEL !== "1") {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}
exports.default = app;
