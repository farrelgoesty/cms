"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = void 0;
const prisma_1 = require("../config/prisma");
const client_1 = require("@prisma/client");
exports.dashboardService = {
    async getStats() {
        const [posts, comments, categories, users, media, publishedViews, drafts, publishedPosts, pendingComments, latestPosts, latestComments] = await Promise.all([
            prisma_1.prisma.post.count(),
            prisma_1.prisma.comment.count(),
            prisma_1.prisma.category.count(),
            prisma_1.prisma.user.count(),
            prisma_1.prisma.media.count(),
            prisma_1.prisma.post.aggregate({ _sum: { viewCount: true }, where: { status: client_1.PostStatus.PUBLISHED } }),
            prisma_1.prisma.post.count({ where: { status: client_1.PostStatus.DRAFT } }),
            prisma_1.prisma.post.count({ where: { status: client_1.PostStatus.PUBLISHED } }),
            prisma_1.prisma.comment.count({ where: { status: "PENDING" } }),
            prisma_1.prisma.post.findMany({
                take: 5,
                orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
                select: {
                    id: true,
                    title: true,
                    status: true,
                    author: {
                        select: {
                            name: true
                        }
                    }
                }
            }),
            prisma_1.prisma.comment.findMany({
                take: 5,
                orderBy: [{ createdAt: "desc" }],
                select: {
                    id: true,
                    name: true,
                    content: true,
                    status: true,
                    createdAt: true,
                    post: {
                        select: {
                            id: true,
                            title: true,
                            slug: true
                        }
                    }
                }
            })
        ]);
        return {
            posts,
            comments,
            categories,
            users,
            media,
            views: publishedViews._sum.viewCount ?? 0,
            drafts,
            publishedPosts,
            pendingComments,
            latestPosts,
            latestComments
        };
    }
};
