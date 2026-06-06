"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const router = (0, express_1.Router)();
router.post('/track', controller_1.trackAffiliateClick);
router.get('/', controller_1.getAffiliateClicks);
exports.default = router;
