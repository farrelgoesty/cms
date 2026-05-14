import { prisma } from "../config/prisma";
import { CommentStatus } from "@prisma/client";

export const commentRepository = {
  create(data: { postId: string; parentId?: string; name: string; email?: string | null; content: string }) {
    const createData = {
      postId: data.postId,
      name: data.name,
      content: data.content,
      status: CommentStatus.PENDING,
      ...(data.parentId ? { parentId: data.parentId } : {}),
      ...(data.email ? { email: data.email } : {})
    };

    return prisma.comment.create({
      data: createData
    });
  },

  listAdmin(params?: { skip: number; take: number; q?: string; status?: CommentStatus | "ALL" }) {
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

    return prisma.comment.findMany({
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

  countAdmin(params?: { q?: string; status?: CommentStatus | "ALL" }) {
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

    return prisma.comment.count({
      ...(Object.keys(where).length ? { where } : {})
    });
  },

  countApproved() {
    return prisma.comment.count({ where: { status: CommentStatus.APPROVED } });
  },

  async updateStatus(id: string, status: CommentStatus) {
    return prisma.comment.update({
      where: { id },
      data: { status }
    });
  },

  delete(id: string) {
    return prisma.comment.delete({ where: { id } });
  }
};
