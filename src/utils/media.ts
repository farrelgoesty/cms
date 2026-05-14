import path from "path";

export const MAX_MEDIA_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_MEDIA_UPLOAD_MB = 5;
export const DEFAULT_YOUTUBE_LABEL = "Video Pendukung";

export type MediaKind = "image" | "video" | "document" | "other";
export type MediaTypeFilter = "all" | "image" | "video" | "document";

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

export function getMediaKind(mimeType?: string | null): MediaKind {
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

export function getMediaLabel(kind: MediaKind) {
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

export function getMediaKindLabel(kind: MediaKind) {
  return getMediaLabel(kind);
}

export function buildMediaPreviewUrl(filePath: string, thumbnailPath?: string | null, mimeType?: string | null) {
  const kind = getMediaKind(mimeType);
  if (kind === "image") {
    return thumbnailPath || filePath;
  }

  return filePath;
}

export function getMediaAcceptAttribute() {
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

export function isAllowedMediaUpload(file: { mimetype: string; originalname: string }) {
  const ext = path.extname(file.originalname).toLowerCase();
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

export function isSafeSvgContent(content: string) {
  const normalized = content.toLowerCase();
  return !(
    normalized.includes("<script") ||
    normalized.includes("javascript:") ||
    normalized.includes("onload=") ||
    normalized.includes("onerror=") ||
    normalized.includes("onclick=")
  );
}

export function getMediaTypeFilterOptions() {
  return [
    { label: "All", value: "all" },
    { label: "Images", value: "image" },
    { label: "Videos", value: "video" },
    { label: "Documents", value: "document" }
  ] as const;
}

export function getYoutubeLabelOptions() {
  return [
    { label: "Auto (Video Pendukung)", value: "AUTO" },
    { label: "Video Pendukung", value: "Video Pendukung" },
    { label: "Video Kajian", value: "Video Kajian" },
    { label: "Video Referensi", value: "Video Referensi" },
    { label: "Video Terkait", value: "Video Terkait" },
    { label: "Dokumentasi Video", value: "Dokumentasi Video" },
    { label: "Media Tambahan", value: "Media Tambahan" },
    { label: "Custom", value: "CUSTOM" }
  ] as const;
}

export function getYoutubeDefaultLabel() {
  return DEFAULT_YOUTUBE_LABEL;
}

export function buildMediaInsertHtml(params: {
  kind: MediaKind;
  filePath: string;
  previewUrl?: string;
  fileName: string;
  altText?: string | null;
  mimeType?: string | null;
  linkUrl?: string | null;
}) {
  const safeName = params.fileName.replace(/"/g, "&quot;");
  const href = params.filePath;
  const previewUrl = params.previewUrl || params.filePath;
  const altText = params.altText?.trim() || params.fileName;
  const linkUrl = params.linkUrl?.trim() || "";

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
