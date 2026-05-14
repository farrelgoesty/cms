"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeNoticeType = normalizeNoticeType;
exports.appendNotice = appendNotice;
function normalizeNoticeType(value) {
    if (value === "success" || value === "error" || value === "warning" || value === "info") {
        return value;
    }
    return "info";
}
function appendNotice(url, message, type = "success") {
    if (!message) {
        return url;
    }
    const parsed = new URL(url, "http://cms.local");
    parsed.searchParams.set("notice", message);
    parsed.searchParams.set("noticeType", type);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
