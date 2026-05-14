"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRepository = void 0;
const prisma_1 = require("../config/prisma");
const client_1 = require("@prisma/client");
const postInclude = {
    author: true,
    postCategories: {
        include: { category: true }
    },
    postTags: {
        include: { tag: true }
    },
    comments: {
        where: { status: client_1.CommentStatus.APPROVED },
        orderBy: { createdAt: "desc" }
    }
};
exports.postRepository = {
    listCategories() {
        return prisma_1.prisma.category.findMany({
            orderBy: { name: "asc" }
        });
    },
    listPublishedLinkOptions(excludeId) {
        return prisma_1.prisma.post.findMany({
            where: {
                status: client_1.PostStatus.PUBLISHED,
                ...(excludeId ? { id: { not: excludeId } } : {})
            },
            select: {
                title: true,
                slug: true
            },
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
            take: 100
        });
    },
    listAdmin(params) {
        const q = params.q?.trim();
        const where = {
            ...(params.status && params.status !== "ALL" ? { status: params.status } : {}),
            ...(q
                ? {
                    OR: [
                        { title: { contains: q } },
                        { slug: { contains: q } },
                        { excerpt: { contains: q } },
                        { subheadline: { contains: q } }
                    ]
                }
                : {})
        };
        return prisma_1.prisma.post.findMany({
            ...(Object.keys(where).length ? { where } : {}),
            include: postInclude,
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            skip: params.skip,
            take: params.take
        });
    },
    countAdmin(status, q) {
        const search = q?.trim();
        const where = {
            ...(status && status !== "ALL" ? { status } : {}),
            ...(search
                ? {
                    OR: [
                        { title: { contains: search } },
                        { slug: { contains: search } },
                        { excerpt: { contains: search } },
                        { subheadline: { contains: search } }
                    ]
                }
                : {})
        };
        return prisma_1.prisma.post.count({
            ...(Object.keys(where).length ? { where } : {})
        });
    },
    listPublished(params) {
        return prisma_1.prisma.post.findMany({
            where: {
                status: client_1.PostStatus.PUBLISHED,
                ...(params.categorySlug
                    ? { postCategories: { some: { category: { slug: params.categorySlug } } } }
                    : {}),
                ...(params.tagSlug ? { postTags: { some: { tag: { slug: params.tagSlug } } } } : {})
            },
            include: postInclude,
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
            skip: params.skip,
            take: params.take
        });
    },
    searchPublished(query, skip, take) {
        return prisma_1.prisma.post.findMany({
            where: {
                status: client_1.PostStatus.PUBLISHED,
                OR: [
                    { title: { contains: query } },
                    { subheadline: { contains: query } },
                    { excerpt: { contains: query } },
                    { content: { contains: query } }
                ]
            },
            include: postInclude,
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
            skip,
            take
        });
    },
    countPublished(where) {
        return prisma_1.prisma.post.count({
            where: { status: client_1.PostStatus.PUBLISHED, ...(where ?? {}) }
        });
    },
    findPublishedBySlug(slug) {
        return prisma_1.prisma.post.findFirst({
            where: { slug, status: client_1.PostStatus.PUBLISHED },
            include: {
                ...postInclude,
                comments: {
                    where: { status: "APPROVED" },
                    orderBy: { createdAt: "asc" }
                },
                media: true
            }
        });
    },
    findById(id) {
        return prisma_1.prisma.post.findUnique({
            where: { id },
            include: {
                author: true,
                postCategories: { include: { category: true } },
                postTags: { include: { tag: true } },
                media: true
            }
        });
    },
    async create(data, categoryIds, tagIds) {
        return prisma_1.prisma.post.create({
            data: {
                ...data,
                postCategories: {
                    create: categoryIds.map((categoryId) => ({ category: { connect: { id: categoryId } } }))
                },
                postTags: {
                    create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } }))
                }
            }
        });
    },
    async update(id, data, categoryIds, tagIds) {
        return prisma_1.prisma.$transaction([
            prisma_1.prisma.postCategory.deleteMany({ where: { postId: id } }),
            prisma_1.prisma.postTag.deleteMany({ where: { postId: id } }),
            prisma_1.prisma.post.update({
                where: { id },
                data
            }),
            prisma_1.prisma.postCategory.createMany({
                data: categoryIds.map((categoryId) => ({ postId: id, categoryId }))
            }),
            prisma_1.prisma.postTag.createMany({
                data: tagIds.map((tagId) => ({ postId: id, tagId }))
            })
        ]);
    },
    delete(id) {
        return prisma_1.prisma.post.delete({ where: { id } });
    },
    incrementViewCount(id) {
        return prisma_1.prisma.post.update({
            where: { id },
            data: { viewCount: { increment: 1 } }
        });
    },
    related(postId, categoryIds, tagIds, take = 4) {
        const hasFilters = categoryIds.length > 0 || tagIds.length > 0;
        return prisma_1.prisma.post.findMany({
            where: {
                id: { not: postId },
                status: client_1.PostStatus.PUBLISHED,
                ...(hasFilters
                    ? {
                        OR: [
                            ...(categoryIds.length
                                ? [
                                    {
                                        postCategories: {
                                            some: { categoryId: { in: categoryIds } }
                                        }
                                    }
                                ]
                                : []),
                            ...(tagIds.length
                                ? [
                                    {
                                        postTags: {
                                            some: { tagId: { in: tagIds } }
                                        }
                                    }
                                ]
                                : [])
                        ]
                    }
                    : {})
            },
            take,
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]
        });
    }
};
