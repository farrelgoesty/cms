"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePublicUrl = normalizePublicUrl;
function normalizePublicUrl(value) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
        return null;
    }
    if (/^(https?:)?\/\//i.test(trimmed) || /^(data:|blob:)/i.test(trimmed)) {
        return trimmed;
    }
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
