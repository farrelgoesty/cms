"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.mediaRepository = {
    findById(id) {
        return prisma_1.prisma.media.findUnique({
            where: { id },
            select: {
                id: true,
                fileName: true,
                filePath: true,
                thumbnailPath: true,
                fileData: true,
                thumbnailData: true,
                mimeType: true,
                fileSize: true,
                width: true,
                height: true,
                altText: true,
                uploadedById: true,
                postId: true,
                createdAt: true,
                uploadedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                post: {
                    select: {
                        id: true,
                        title: true,
                        slug: true
                    }
                }
            }
        });
    },
    list(params) {
        const q = params?.q?.trim();
        const type = params?.type ?? "all";
        const where = {
            ...(q
                ? {
                    OR: [
                        { fileName: { contains: q } },
                        { mimeType: { contains: q } },
                        { altText: { contains: q } }
                    ]
                }
                : {}),
            ...(type !== "all"
                ? {
                    mimeType: type === "image"
                        ? { startsWith: "image/" }
                        : type === "video"
                            ? { startsWith: "video/" }
                            : { equals: "application/pdf" }
                }
                : {})
        };
        return prisma_1.prisma.media.findMany({
            select: {
                id: true,
                fileName: true,
                filePath: true,
                thumbnailPath: true,
                mimeType: true,
                fileSize: true,
                width: true,
                height: true,
                altText: true,
                uploadedById: true,
                postId: true,
                createdAt: true,
                uploadedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                post: {
                    select: {
                        id: true,
                        title: true,
                        slug: true
                    }
                }
            },
            ...(Object.keys(where).length ? { where } : {}),
            orderBy: { createdAt: "desc" },
            ...(params ? { skip: params.skip, take: params.take } : {})
        });
    },
    findDuplicateCandidates(params) {
        return prisma_1.prisma.media.findMany({
            where: {
                mimeType: params.mimeType,
                fileSize: params.fileSize
            },
            select: {
                id: true,
                fileName: true,
                filePath: true,
                thumbnailPath: true,
                fileData: true,
                thumbnailData: true,
                mimeType: true,
                fileSize: true,
                width: true,
                height: true,
                altText: true,
                uploadedById: true,
                postId: true,
                createdAt: true
            },
            orderBy: { createdAt: "desc" },
            take: params.take ?? 8
        });
    },
    count(q, type) {
        const search = q?.trim();
        const filterType = type ?? "all";
        const where = {
            ...(search
                ? {
                    OR: [
                        { fileName: { contains: search } },
                        { mimeType: { contains: search } },
                        { altText: { contains: search } }
                    ]
                }
                : {}),
            ...(filterType !== "all"
                ? {
                    mimeType: filterType === "image"
                        ? { startsWith: "image/" }
                        : filterType === "video"
                            ? { startsWith: "video/" }
                            : { equals: "application/pdf" }
                }
                : {})
        };
        return prisma_1.prisma.media.count({
            ...(Object.keys(where).length ? { where } : {})
        });
    },
    create(data) {
        return prisma_1.prisma.media.create({
            data: {
                fileName: data.fileName,
                filePath: data.filePath,
                ...(data.thumbnailPath ? { thumbnailPath: data.thumbnailPath } : {}),
                fileData: Buffer.from(data.fileData),
                ...(data.thumbnailData ? { thumbnailData: Buffer.from(data.thumbnailData) } : {}),
                mimeType: data.mimeType,
                fileSize: data.fileSize,
                ...(data.width !== undefined ? { width: data.width } : {}),
                ...(data.height !== undefined ? { height: data.height } : {}),
                ...(data.altText ? { altText: data.altText } : {}),
                uploadedById: data.uploadedById,
                ...(data.postId ? { postId: data.postId } : {})
            }
        });
    },
    update(id, data) {
        return prisma_1.prisma.media.update({
            where: { id },
            data: {
                ...(data.filePath !== undefined ? { filePath: data.filePath } : {}),
                ...(data.thumbnailPath !== undefined ? { thumbnailPath: data.thumbnailPath } : {})
            }
        });
    },
    delete(id) {
        return prisma_1.prisma.media.delete({ where: { id } });
    }
};
