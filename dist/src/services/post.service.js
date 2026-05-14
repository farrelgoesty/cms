"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postService = void 0;
const client_1 = require("@prisma/client");
const post_repository_1 = require("../repositories/post.repository");
const category_service_1 = require("./category.service");
const tag_service_1 = require("./tag.service");
const slugify_1 = require("../utils/slugify");
const reading_time_1 = require("../utils/reading-time");
const sanitize_1 = require("../utils/sanitize");
const prisma_1 = require("../config/prisma");
const youtube_1 = require("../utils/youtube");
const media_1 = require("../utils/media");
function parseNames(value) {
    return (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}
function parseFaqItems(value) {
    if (Array.isArray(value)) {
        return value
            .map((item) => {
            if (!item || typeof item !== "object") {
                return null;
            }
            const question = typeof item.question === "string" ? item.question.trim() : "";
            const answer = typeof item.answer === "string" ? item.answer.trim() : "";
            if (!question || !answer) {
                return null;
            }
            return { question, answer };
        })
            .filter((item) => Boolean(item));
    }
    return [];
}
async function ensureUniqueSlug(baseSlug, excludeId) {
    let slug = baseSlug;
    let counter = 2;
    while (await prisma_1.prisma.post.findFirst({
        where: {
            slug,
            ...(excludeId ? { id: { not: excludeId } } : {})
        },
        select: { id: true }
    })) {
        slug = `${baseSlug}-${counter}`;
        counter += 1;
    }
    return slug;
}
exports.postService = {
    async listAdmin(page, limit, status, q) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            post_repository_1.postRepository.listAdmin({ skip, take: limit, ...(status ? { status } : {}), ...(q ? { q } : {}) }),
            post_repository_1.postRepository.countAdmin(status, q)
        ]);
        return { items, total };
    },
    async getCreateFormData() {
        const [categories, tags, linkOptions] = await Promise.all([
            post_repository_1.postRepository.listCategories(),
            tag_service_1.tagService.list(),
            post_repository_1.postRepository.listPublishedLinkOptions()
        ]);
        return {
            categories,
            tags,
            linkOptions,
            mediaTypes: (0, media_1.getMediaTypeFilterOptions)(),
            youtubeLabelOptions: (0, media_1.getYoutubeLabelOptions)(),
            defaultYoutubeLabel: (0, media_1.getYoutubeDefaultLabel)()
        };
    },
    async getEditFormData(id) {
        const [post, categories, tags, linkOptions] = await Promise.all([
            post_repository_1.postRepository.findById(id),
            post_repository_1.postRepository.listCategories(),
            tag_service_1.tagService.list(),
            post_repository_1.postRepository.listPublishedLinkOptions(id)
        ]);
        return {
            post,
            categories,
            tags,
            linkOptions,
            mediaTypes: (0, media_1.getMediaTypeFilterOptions)(),
            youtubeLabelOptions: (0, media_1.getYoutubeLabelOptions)(),
            defaultYoutubeLabel: (0, media_1.getYoutubeDefaultLabel)()
        };
    },
    async create(input) {
        const categories = await category_service_1.categoryService.ensureNames(parseNames(input.categoryNames));
        const tags = await tag_service_1.tagService.ensureNames(parseNames(input.tagNames));
        const categoryIds = Array.from(new Set([...input.categoryIds, ...categories.map((item) => item.id)]));
        const tagIds = Array.from(new Set([...input.tagIds, ...tags.map((item) => item.id)]));
        const slug = await ensureUniqueSlug((0, slugify_1.makeSlug)(input.slug || input.title));
        const content = (0, sanitize_1.sanitizeRichText)(input.content);
        const excerpt = input.excerpt ? (0, sanitize_1.sanitizeRichText)(input.excerpt) : undefined;
        const postData = {
            title: input.title,
            slug,
            content,
            faqItems: parseFaqItems(input.faqItems),
            ...(input.youtubeUrl !== undefined ? { youtubeUrl: (0, youtube_1.normalizeYoutubeUrl)(input.youtubeUrl) ?? null } : {}),
            ...(input.youtubeLabel ? { youtubeLabel: (0, sanitize_1.sanitizePlainText)(input.youtubeLabel) } : {}),
            youtubePosition: input.youtubePosition,
            status: input.status,
            publishedAt: input.status === client_1.PostStatus.PUBLISHED ? new Date() : null,
            readingTime: (0, reading_time_1.getReadingTime)(content),
            author: { connect: { id: input.authorId } },
            ...(input.subheadline ? { subheadline: (0, sanitize_1.sanitizePlainText)(input.subheadline) } : {}),
            ...(excerpt ? { excerpt } : {}),
            ...(input.featuredImage ? { featuredImage: input.featuredImage } : {}),
            ...(input.seoTitle ? { seoTitle: input.seoTitle } : {}),
            ...(input.seoDescription ? { seoDescription: input.seoDescription } : {})
        };
        return post_repository_1.postRepository.create(postData, categoryIds, tagIds);
    },
    async update(id, input) {
        const categories = await category_service_1.categoryService.ensureNames(parseNames(input.categoryNames));
        const tags = await tag_service_1.tagService.ensureNames(parseNames(input.tagNames));
        const categoryIds = Array.from(new Set([...input.categoryIds, ...categories.map((item) => item.id)]));
        const tagIds = Array.from(new Set([...input.tagIds, ...tags.map((item) => item.id)]));
        const existing = await post_repository_1.postRepository.findById(id);
        if (!existing) {
            throw new Error("Post not found");
        }
        const slug = await ensureUniqueSlug((0, slugify_1.makeSlug)(input.slug || input.title), id);
        const content = (0, sanitize_1.sanitizeRichText)(input.content);
        const excerpt = input.excerpt ? (0, sanitize_1.sanitizeRichText)(input.excerpt) : undefined;
        const postData = {
            title: input.title,
            slug,
            content,
            faqItems: parseFaqItems(input.faqItems),
            ...(input.youtubeUrl !== undefined ? { youtubeUrl: (0, youtube_1.normalizeYoutubeUrl)(input.youtubeUrl) ?? null } : {}),
            ...(input.youtubeLabel ? { youtubeLabel: (0, sanitize_1.sanitizePlainText)(input.youtubeLabel) } : {}),
            youtubePosition: input.youtubePosition,
            status: input.status,
            publishedAt: input.status === client_1.PostStatus.PUBLISHED && !existing.publishedAt ? new Date() : existing.publishedAt,
            readingTime: (0, reading_time_1.getReadingTime)(content),
            ...(input.subheadline ? { subheadline: (0, sanitize_1.sanitizePlainText)(input.subheadline) } : {}),
            ...(excerpt ? { excerpt } : {}),
            ...(input.featuredImage ? { featuredImage: input.featuredImage } : {}),
            ...(input.seoTitle ? { seoTitle: input.seoTitle } : {}),
            ...(input.seoDescription ? { seoDescription: input.seoDescription } : {})
        };
        await post_repository_1.postRepository.update(id, postData, categoryIds, tagIds);
    },
    async setStatus(id, status) {
        const existing = await post_repository_1.postRepository.findById(id);
        if (!existing) {
            throw new Error("Post not found");
        }
        return prisma_1.prisma.post.update({
            where: { id },
            data: {
                status,
                publishedAt: status === client_1.PostStatus.PUBLISHED
                    ? existing.publishedAt ?? new Date()
                    : existing.publishedAt
            }
        });
    },
    delete(id) {
        return post_repository_1.postRepository.delete(id);
    }
};
