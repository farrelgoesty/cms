"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaController = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const media_repository_1 = require("../repositories/media.repository");
function routeParam(value) {
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}
function sendMedia(res, media, useThumbnail = false) {
    if (!media) {
        return res.status(404).end();
    }
    const filename = media.fileName || "file";
    const data = useThumbnail ? media.thumbnailData ?? media.fileData : media.fileData;
    if (data) {
        res.setHeader("Content-Type", media.mimeType);
        res.setHeader("Content-Disposition", `inline; filename="${filename.replace(/"/g, '\\"')}"`);
        res.send(Buffer.from(data));
        return;
    }
    const publicPath = path_1.default.join(process.cwd(), "public", (useThumbnail ? media.thumbnailPath : media.filePath)?.replace(/^\//, "") || "");
    if (publicPath && fs_1.default.existsSync(publicPath)) {
        res.sendFile(publicPath);
        return;
    }
    res.status(404).end();
}
exports.mediaController = {
    async show(req, res) {
        const media = await media_repository_1.mediaRepository.findById(routeParam(req.params.id));
        return sendMedia(res, media, false);
    },
    async thumbnail(req, res) {
        const media = await media_repository_1.mediaRepository.findById(routeParam(req.params.id));
        return sendMedia(res, media, true);
    }
};
