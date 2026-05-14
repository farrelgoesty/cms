"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = notFound;
exports.errorHandler = errorHandler;
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
function notFound(req, res) {
    res.status(404).render("errors/404", {
        layout: "layouts/blog",
        title: "Page not found"
    });
}
function errorHandler(err, req, res, _next) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const statusCode = message.includes("CSRF token")
        ? 403
        : err instanceof multer_1.default.MulterError || message.includes("Format file tidak didukung") || message.includes("File too large") || message.includes("SVG tidak aman")
            ? 400
            : 500;
    const uploadErrorMessage = message.includes("File too large")
        ? "Ukuran file maksimal 5 MB."
        : message.includes("Format file tidak didukung")
            ? "Format file tidak didukung. Gunakan image, video, atau PDF yang valid."
            : message.includes("SVG tidak aman")
                ? "SVG tidak aman. Hapus script atau event handler sebelum upload."
                : message;
    if (res.headersSent) {
        return;
    }
    if (req.file?.path) {
        fs_1.default.promises.unlink(req.file.path).catch(() => undefined);
    }
    if (req.path === "/admin/media/upload") {
        res.status(statusCode).json({ error: uploadErrorMessage });
        return;
    }
    if (statusCode === 403) {
        res.status(statusCode).render("errors/403", {
            layout: "layouts/blog",
            title: "Forbidden",
            message
        });
        return;
    }
    res.status(statusCode).render("errors/500", {
        layout: "layouts/blog",
        title: "Something went wrong",
        message: uploadErrorMessage
    });
}
