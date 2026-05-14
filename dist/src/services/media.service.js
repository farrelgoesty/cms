"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
const media_repository_1 = require("../repositories/media.repository");
const sanitize_1 = require("../utils/sanitize");
const media_1 = require("../utils/media");
function decorateMedia(item) {
    const kind = (0, media_1.getMediaKind)(item.mimeType);
    return {
        ...item,
        kind,
        kindLabel: kind.charAt(0).toUpperCase() + kind.slice(1),
        previewUrl: (0, media_1.buildMediaPreviewUrl)(item.filePath, item.thumbnailPath, item.mimeType),
        maxUploadMb: media_1.MAX_MEDIA_UPLOAD_MB
    };
}
function formatMediaResponse(item) {
    const kind = (0, media_1.getMediaKind)(item.mimeType);
    return {
        id: item.id,
        fileName: item.fileName,
        filePath: item.filePath,
        thumbnailPath: item.thumbnailPath ?? null,
        mimeType: item.mimeType,
        fileSize: item.fileSize,
        width: item.width ?? null,
        height: item.height ?? null,
        altText: item.altText ?? null,
        uploadedById: item.uploadedById,
        postId: item.postId ?? null,
        createdAt: item.createdAt,
        kind,
        kindLabel: kind.charAt(0).toUpperCase() + kind.slice(1),
        previewUrl: (0, media_1.buildMediaPreviewUrl)(item.filePath, item.thumbnailPath, item.mimeType),
        maxUploadMb: media_1.MAX_MEDIA_UPLOAD_MB
    };
}
function isImageMimeType(mimeType) {
    return mimeType.startsWith("image/") && mimeType !== "image/svg+xml";
}
function isSafeImageUpload(file, sourceBuffer) {
    if (file.mimetype !== "image/svg+xml") {
        return true;
    }
    return (0, media_1.isSafeSvgContent)(sourceBuffer.toString("utf8"));
}
async function findDuplicateMedia(mimeType, fileSize, fileData) {
    const candidates = await media_repository_1.mediaRepository.findDuplicateCandidates({
        mimeType,
        fileSize
    });
    return candidates.find((candidate) => {
        if (!candidate.fileData) {
            return false;
        }
        return candidate.fileData.length === fileData.length && crypto_1.default.timingSafeEqual(candidate.fileData, fileData);
    });
}
exports.mediaService = {
    list(page, limit, q, type) {
        const skip = (page - 1) * limit;
        return Promise.all([
            media_repository_1.mediaRepository.list({
                skip,
                take: limit,
                ...(q ? { q } : {}),
                ...(type ? { type } : {})
            }),
            media_repository_1.mediaRepository.count(q, type)
        ]).then(([items, total]) => ({ items: items.map(decorateMedia), total }));
    },
    async processUpload(file, userId) {
        const sourceBuffer = await fs_1.default.promises.readFile(file.path);
        const fileName = (0, sanitize_1.sanitizePlainText)(file.originalname);
        const imageUpload = isImageMimeType(file.mimetype);
        try {
            if (imageUpload && !isSafeImageUpload(file, sourceBuffer)) {
                throw new Error("SVG tidak aman. Hapus script atau event handler sebelum upload.");
            }
            let fileData = sourceBuffer;
            let thumbnailData;
            let width;
            let height;
            let storedMimeType = file.mimetype;
            if (imageUpload) {
                const optimized = await (0, sharp_1.default)(sourceBuffer)
                    .resize({ width: 2200, withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toBuffer();
                const thumb = await (0, sharp_1.default)(sourceBuffer)
                    .resize({ width: 480, height: 320, fit: "cover" })
                    .webp({ quality: 78 })
                    .toBuffer();
                const meta = await (0, sharp_1.default)(optimized).metadata();
                fileData = optimized;
                thumbnailData = thumb;
                storedMimeType = "image/webp";
                width = meta.width;
                height = meta.height;
            }
            const fileSize = fileData.length;
            const duplicate = await findDuplicateMedia(storedMimeType, fileSize, fileData);
            if (duplicate) {
                return formatMediaResponse(duplicate);
            }
            const created = await media_repository_1.mediaRepository.create({
                fileName,
                filePath: "/media/pending",
                ...(thumbnailData ? { thumbnailPath: "/media/pending/thumbnail" } : {}),
                fileData,
                ...(thumbnailData ? { thumbnailData } : {}),
                mimeType: storedMimeType,
                fileSize,
                ...(width !== undefined ? { width } : {}),
                ...(height !== undefined ? { height } : {}),
                uploadedById: userId
            });
            const fileUrl = `/media/${created.id}/file`;
            const thumbnailUrl = thumbnailData ? `/media/${created.id}/thumbnail` : null;
            const updated = await media_repository_1.mediaRepository.update(created.id, {
                filePath: fileUrl,
                ...(thumbnailUrl !== null ? { thumbnailPath: thumbnailUrl } : { thumbnailPath: null })
            });
            return formatMediaResponse(updated);
        }
        finally {
            await fs_1.default.promises.unlink(file.path).catch(() => undefined);
        }
    },
    async delete(id) {
        return media_repository_1.mediaRepository.delete(id);
    }
};
