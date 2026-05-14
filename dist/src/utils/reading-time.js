"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReadingTime = getReadingTime;
function getReadingTime(content) {
    const words = content
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
}
