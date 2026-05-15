"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postSchema = void 0;
const zod_1 = require("zod");
const youtube_1 = require("../utils/youtube");
const faqItemSchema = zod_1.z.object({
    question: zod_1.z.string().min(3).max(180),
    answer: zod_1.z.string().min(10).max(1500)
});
const bannerItemSchema = zod_1.z.object({
    image: zod_1.z.string().trim().min(1).max(2048),
    url: zod_1.z.string().trim().max(2048).optional().or(zod_1.z.literal("")),
    position: zod_1.z.enum(["TOP", "RIGHT"]).default("TOP")
});
function parseJsonValue(value) {
    if (typeof value !== "string") {
        return value;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return [];
    }
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return value;
    }
}
exports.postSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(3).max(255),
    slug: zod_1.z.string().trim().optional().or(zod_1.z.literal("")),
    subheadline: zod_1.z.string().trim().max(500).optional().or(zod_1.z.literal("")),
    excerpt: zod_1.z.string().trim().optional().or(zod_1.z.literal("")),
    youtubeUrl: zod_1.z.string().trim().optional().or(zod_1.z.literal("")),
    youtubeLabel: zod_1.z.string().trim().max(160).optional().or(zod_1.z.literal("")),
    youtubePosition: zod_1.z.enum(["TOP", "MIDDLE", "BOTTOM"]).default("TOP"),
    content: zod_1.z.string().min(20),
    featuredImage: zod_1.z.string().trim().optional().or(zod_1.z.literal("")),
    bannerImage: zod_1.z.string().trim().optional().or(zod_1.z.literal("")),
    bannerUrl: zod_1.z.string().trim().max(2048).optional().or(zod_1.z.literal("")),
    bannerPosition: zod_1.z.enum(["TOP", "RIGHT"]).default("TOP"),
    bannerItems: zod_1.z.preprocess(parseJsonValue, zod_1.z.array(bannerItemSchema).max(10)),
    seoTitle: zod_1.z.string().trim().optional().or(zod_1.z.literal("")),
    seoDescription: zod_1.z.string().trim().optional().or(zod_1.z.literal("")),
    status: zod_1.z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    categoryNames: zod_1.z.string().trim().optional().or(zod_1.z.literal("")),
    categoryIds: zod_1.z.preprocess((value) => {
        if (Array.isArray(value)) {
            return value.filter((item) => typeof item === "string" && item.length > 0);
        }
        if (typeof value === "string") {
            return value ? [value] : [];
        }
        return [];
    }, zod_1.z.array(zod_1.z.string().uuid())),
    tagIds: zod_1.z.preprocess((value) => {
        if (Array.isArray(value)) {
            return value.filter((item) => typeof item === "string" && item.length > 0);
        }
        if (typeof value === "string") {
            return value ? [value] : [];
        }
        return [];
    }, zod_1.z.array(zod_1.z.string().uuid())),
    tagNames: zod_1.z.string().trim().optional().or(zod_1.z.literal("")),
    faqItems: zod_1.z.preprocess(parseJsonValue, zod_1.z.array(faqItemSchema).max(8))
}).superRefine((data, ctx) => {
    if (data.youtubeUrl && !(0, youtube_1.isValidYoutubeUrl)(data.youtubeUrl)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["youtubeUrl"],
            message: "Masukkan URL YouTube yang valid."
        });
    }
});
