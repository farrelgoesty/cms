"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_YOUTUBE_LABEL = exports.MAX_MEDIA_UPLOAD_MB = exports.MAX_MEDIA_UPLOAD_BYTES = void 0;
exports.getMediaKind = getMediaKind;
exports.getMediaLabel = getMediaLabel;
exports.getMediaKindLabel = getMediaKindLabel;
exports.buildMediaPreviewUrl = buildMediaPreviewUrl;
exports.getMediaAcceptAttribute = getMediaAcceptAttribute;
exports.isAllowedMediaUpload = isAllowedMediaUpload;
exports.isSafeSvgContent = isSafeSvgContent;
exports.getMediaTypeFilterOptions = getMediaTypeFilterOptions;
exports.getYoutubeLabelOptions = getYoutubeLabelOptions;
exports.getYoutubeDefaultLabel = getYoutubeDefaultLabel;
exports.normalizeLinkUrl = normalizeLinkUrl;
exports.buildMediaInsertHtml = buildMediaInsertHtml;
const path_1 = __importDefault(require("path"));
exports.MAX_MEDIA_UPLOAD_BYTES = 5 * 1024 * 1024;
exports.MAX_MEDIA_UPLOAD_MB = 5;
exports.DEFAULT_YOUTUBE_LABEL = "Video Pendukung";
const IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/avif",
    "image/heic",
    "image/heif",
    "image/bmp",
    "image/tiff",
    "image/x-icon"
]);
const VIDEO_MIME_TYPES = new Set([
    "video/mp4",
    "video/webm",
    "video/quicktime"
]);
const DOCUMENT_MIME_TYPES = new Set([
    "application/pdf"
]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif", ".heic", ".heif", ".bmp", ".tif", ".tiff", ".ico"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);
const DOCUMENT_EXTENSIONS = new Set([".pdf"]);
const ACCEPTED_MIME_TYPES = new Set([
    ...IMAGE_MIME_TYPES,
    ...VIDEO_MIME_TYPES,
    ...DOCUMENT_MIME_TYPES
]);
function getMediaKind(mimeType) {
    if (!mimeType) {
        return "other";
    }
    if (IMAGE_MIME_TYPES.has(mimeType)) {
        return "image";
    }
    if (VIDEO_MIME_TYPES.has(mimeType)) {
        return "video";
    }
    if (DOCUMENT_MIME_TYPES.has(mimeType)) {
        return "document";
    }
    return "other";
}
function getMediaLabel(kind) {
    switch (kind) {
        case "image":
            return "Image";
        case "video":
            return "Video";
        case "document":
            return "Document";
        default:
            return "Other";
    }
}
function getMediaKindLabel(kind) {
    return getMediaLabel(kind);
}
function buildMediaPreviewUrl(filePath, thumbnailPath, mimeType) {
    const kind = getMediaKind(mimeType);
    if (kind === "image") {
        return thumbnailPath || filePath;
    }
    return filePath;
}
function getMediaAcceptAttribute() {
    return [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".svg",
        ".avif",
        ".heic",
        ".heif",
        ".bmp",
        ".tif",
        ".tiff",
        ".ico",
        ".mp4",
        ".webm",
        ".mov",
        ".pdf"
    ].join(",");
}
function isAllowedMediaUpload(file) {
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    const kind = getMediaKind(file.mimetype);
    if (!ACCEPTED_MIME_TYPES.has(file.mimetype)) {
        return false;
    }
    if (kind === "image") {
        return IMAGE_EXTENSIONS.has(ext);
    }
    if (kind === "video") {
        return VIDEO_EXTENSIONS.has(ext);
    }
    if (kind === "document") {
        return DOCUMENT_EXTENSIONS.has(ext);
    }
    return false;
}
function isSafeSvgContent(content) {
    const normalized = content.toLowerCase();
    return !(normalized.includes("<script") ||
        normalized.includes("javascript:") ||
        normalized.includes("onload=") ||
        normalized.includes("onerror=") ||
        normalized.includes("onclick="));
}
function getMediaTypeFilterOptions() {
    return [
        { label: "All", value: "all" },
        { label: "Images", value: "image" },
        { label: "Videos", value: "video" },
        { label: "Documents", value: "document" }
    ];
}
function getYoutubeLabelOptions() {
    return [
        { label: "Auto (Video Pendukung)", value: "AUTO" },
        { label: "Video Pendukung", value: "Video Pendukung" },
        { label: "Video Kajian", value: "Video Kajian" },
        { label: "Video Referensi", value: "Video Referensi" },
        { label: "Video Terkait", value: "Video Terkait" },
        { label: "Dokumentasi Video", value: "Dokumentasi Video" },
        { label: "Media Tambahan", value: "Media Tambahan" },
        { label: "Custom", value: "CUSTOM" }
    ];
}
function getYoutubeDefaultLabel() {
    return exports.DEFAULT_YOUTUBE_LABEL;
}
function normalizeLinkUrl(value) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
        return "";
    }
    if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(trimmed)) {
        return trimmed;
    }
    if (/\s/.test(trimmed)) {
        return "";
    }
    return `https://${trimmed}`;
}
function buildMediaInsertHtml(params) {
    const safeName = params.fileName.replace(/"/g, "&quot;");
    const href = params.filePath;
    const previewUrl = params.previewUrl || params.filePath;
    const altText = params.altText?.trim() || params.fileName;
    const linkUrl = normalizeLinkUrl(params.linkUrl);
    if (params.kind === "image") {
        const imageHtml = `<img src="${previewUrl}" alt="${altText.replace(/"/g, "&quot;")}" loading="lazy" decoding="async" />`;
        return linkUrl
            ? `<figure class="media-figure"><a href="${linkUrl}" rel="noopener noreferrer">${imageHtml}</a></figure>`
            : `<figure class="media-figure">${imageHtml}</figure>`;
    }
    if (params.kind === "video") {
        return `<figure class="media-figure"><video controls playsinline preload="metadata" src="${href}" title="${safeName}"></video><figcaption>${safeName}</figcaption></figure>`;
    }
    if (params.mimeType === "application/pdf") {
        return `<p><a href="${href}" target="_blank" rel="noopener noreferrer">${safeName}</a></p>`;
    }
    return `<p><a href="${href}" target="_blank" rel="noopener noreferrer">${safeName}</a></p>`;
}
