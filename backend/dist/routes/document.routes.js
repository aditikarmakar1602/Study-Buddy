"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const document_controller_1 = require("../controllers/document.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect); // Require JWT for all document routes
router.post('/upload', upload_middleware_1.upload.single('file'), document_controller_1.uploadDocument);
router.get('/', document_controller_1.getDocuments);
router.delete('/:id', document_controller_1.deleteDocument);
exports.default = router;
