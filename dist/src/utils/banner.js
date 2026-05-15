"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBannerItems = normalizeBannerItems;
exports.legacyBannerToItems = legacyBannerToItems;
exports.resolveBannerItems = resolveBannerItems;
const media_1 = require("./media");
function isBannerPosition(value) {
    return value === "TOP" || value === "RIGHT";
}
function normalizePosition(value) {
    if (value === "LEFT") {
        return "RIGHT";
    }
    return isBannerPosition(value) ? value : "TOP";
}
function normalizeUrl(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const normalized = (0, media_1.normalizeLinkUrl)(value);
    return normalized || undefined;
}
function toBannerItem(value) {
    if (!value || typeof value !== "object") {
        return null;
    }
    const image = typeof value.image === "string" ? value.image.trim() : "";
    if (!image) {
        return null;
    }
    const url = normalizeUrl(value.url);
    const position = normalizePosition(value.position);
    return {
        image,
        position,
        ...(url ? { url } : {})
    };
}
function normalizeBannerItems(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map(toBannerItem).filter((item) => Boolean(item));
}
function legacyBannerToItems(input) {
    const image = typeof input.bannerImage === "string" ? input.bannerImage.trim() : "";
    if (!image) {
        return [];
    }
    const url = normalizeUrl(input.bannerUrl);
    return [
        {
            image,
            position: normalizePosition(input.bannerPosition),
            ...(url ? { url } : {})
        }
    ];
}
function resolveBannerItems(value, legacy) {
    const items = normalizeBannerItems(value);
    return items.length ? items : legacyBannerToItems(legacy);
}
