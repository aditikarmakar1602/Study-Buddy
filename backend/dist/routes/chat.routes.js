"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect); // Require JWT for chat
router.get('/history', chat_controller_1.getChatHistory);
router.delete('/history', chat_controller_1.clearChatHistory);
router.post('/', chat_controller_1.chatWithDocument);
exports.default = router;
