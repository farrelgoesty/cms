import { prisma } from "../config/prisma";

export type MediaFilterKind = "all" | "image" | "video" | "document";

export const mediaRepository = {
  findById(id: string) {
    return prisma.media.findUnique({
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

  list(params?: { skip: number; take: number; q?: string; type?: MediaFilterKind }) {
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
            mimeType:
              type === "image"
                ? { startsWith: "image/" }
                : type === "video"
                  ? { startsWith: "video/" }
                  : { equals: "application/pdf" }
          }
        : {})
    };

    return prisma.media.findMany({
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

  findDuplicateCandidates(params: { mimeType: string; fileSize: number; take?: number }) {
    return prisma.media.findMany({
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

  count(q?: string, type?: MediaFilterKind) {
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
            mimeType:
              filterType === "image"
                ? { startsWith: "image/" }
                : filterType === "video"
                  ? { startsWith: "video/" }
                  : { equals: "application/pdf" }
          }
        : {})
    };

    return prisma.media.count({
      ...(Object.keys(where).length ? { where } : {})
    });
  },

  create(data: {
    fileName: string;
    filePath: string;
    thumbnailPath?: string;
    fileData: Buffer;
    thumbnailData?: Buffer;
    mimeType: string;
    fileSize: number;
    width?: number;
    height?: number;
    altText?: string;
    uploadedById: string;
    postId?: string;
  }) {
    return prisma.media.create({
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

  update(id: string, data: Partial<{
    filePath: string;
    thumbnailPath: string | null;
  }>) {
    return prisma.media.update({
      where: { id },
      data: {
        ...(data.filePath !== undefined ? { filePath: data.filePath } : {}),
        ...(data.thumbnailPath !== undefined ? { thumbnailPath: data.thumbnailPath } : {})
      }
    });
  },

  delete(id: string) {
    return prisma.media.delete({ where: { id } });
  }
};
