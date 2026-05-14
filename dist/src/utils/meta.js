"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCanonicalUrl = buildCanonicalUrl;
function buildCanonicalUrl(baseUrl, path) {
    const normalizedBase = baseUrl.replace(/\/$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
}
