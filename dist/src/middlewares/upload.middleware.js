"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = exports.uploadImage = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const media_1 = require("../utils/media");
const uploadRoot = path_1.default.join(process.cwd(), "public", "uploads");
const tempRoot = path_1.default.join(uploadRoot, "tmp");
fs_1.default.mkdirSync(tempRoot, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, tempRoot),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase() || ".bin";
        cb(null, `${crypto_1.default.randomUUID()}${ext}`);
    }
});
exports.uploadImage = (0, multer_1.default)({
    storage,
    limits: { fileSize: media_1.MAX_MEDIA_UPLOAD_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!(0, media_1.isAllowedMediaUpload)(file)) {
            cb(new Error("Format file tidak didukung. Gunakan image, video, atau PDF yang valid."));
            return;
        }
        cb(null, true);
    }
});
exports.uploadAvatar = (0, multer_1.default)({
    storage,
    limits: { fileSize: media_1.MAX_MEDIA_UPLOAD_BYTES },
    fileFilter: (_req, file, cb) => {
        const kind = (0, media_1.getMediaKind)(file.mimetype);
        if (kind !== "image") {
            cb(new Error("Avatar hanya boleh berupa gambar."));
            return;
        }
        cb(null, true);
    }
});
