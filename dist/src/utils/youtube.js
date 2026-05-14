"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildYoutubePreview = buildYoutubePreview;
exports.normalizeYoutubeUrl = normalizeYoutubeUrl;
exports.isValidYoutubeUrl = isValidYoutubeUrl;
function extractYoutubeIdFromUrl(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    try {
        const url = new URL(trimmed);
        const host = url.hostname.replace(/^www\./i, "").toLowerCase();
        if (host === "youtu.be") {
            const videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
            return videoId || null;
        }
        if (host.endsWith("youtube.com")) {
            if (url.pathname === "/watch") {
                const videoId = url.searchParams.get("v") ?? "";
                return videoId || null;
            }
            const embedMatch = url.pathname.match(/^\/embed\/([^/]+)/);
            if (embedMatch) {
                return embedMatch[1] ?? null;
            }
            const shortsMatch = url.pathname.match(/^\/shorts\/([^/]+)/);
            if (shortsMatch) {
                return shortsMatch[1] ?? null;
            }
            const liveMatch = url.pathname.match(/^\/live\/([^/]+)/);
            if (liveMatch) {
                return liveMatch[1] ?? null;
            }
            const legacyMatch = url.pathname.match(/^\/v\/([^/]+)/);
            if (legacyMatch) {
                return legacyMatch[1] ?? null;
            }
        }
    }
    catch {
        return null;
    }
    return null;
}
function buildYoutubePreview(value) {
    if (!value) {
        return null;
    }
    const videoId = extractYoutubeIdFromUrl(value);
    if (!videoId) {
        return null;
    }
    return {
        videoId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
}
function normalizeYoutubeUrl(value) {
    const preview = buildYoutubePreview(value ?? "");
    return preview ? preview.watchUrl : null;
}
function isValidYoutubeUrl(value) {
    return Boolean(buildYoutubePreview(value ?? ""));
}
