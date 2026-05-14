"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentRepository = void 0;
const prisma_1 = require("../config/prisma");
const client_1 = require("@prisma/client");
exports.commentRepository = {
    create(data) {
        const createData = {
            postId: data.postId,
            name: data.name,
            content: data.content,
            status: client_1.CommentStatus.PENDING,
            ...(data.parentId ? { parentId: data.parentId } : {}),
            ...(data.email ? { email: data.email } : {})
        };
        return prisma_1.prisma.comment.create({
            data: createData
        });
    },
    listAdmin(params) {
        const q = params?.q?.trim();
        const where = {
            ...(params?.status && params.status !== "ALL" ? { status: params.status } : {}),
            ...(q
                ? {
                    OR: [
                        { name: { contains: q } },
                        { email: { contains: q } },
                        { content: { contains: q } },
                        { post: { title: { contains: q } } }
                    ]
                }
                : {})
        };
        return prisma_1.prisma.comment.findMany({
            include: {
                post: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        status: true
                    }
                },
                parent: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            ...(Object.keys(where).length ? { where } : {}),
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            ...(params ? { skip: params.skip, take: params.take } : {})
        });
    },
    countAdmin(params) {
        const q = params?.q?.trim();
        const where = {
            ...(params?.status && params.status !== "ALL" ? { status: params.status } : {}),
            ...(q
                ? {
                    OR: [
                        { name: { contains: q } },
                        { email: { contains: q } },
                        { content: { contains: q } },
                        { post: { title: { contains: q } } }
                    ]
                }
                : {})
        };
        return prisma_1.prisma.comment.count({
            ...(Object.keys(where).length ? { where } : {})
        });
    },
    countApproved() {
        return prisma_1.prisma.comment.count({ where: { status: client_1.CommentStatus.APPROVED } });
    },
    async updateStatus(id, status) {
        return prisma_1.prisma.comment.update({
            where: { id },
            data: { status }
        });
    },
    delete(id) {
        return prisma_1.prisma.comment.delete({ where: { id } });
    }
};
