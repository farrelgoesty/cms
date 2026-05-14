import { prisma } from "../config/prisma";
import { PostStatus } from "@prisma/client";

export const dashboardService = {
  async getStats() {
    const [posts, comments, categories, users, media, publishedViews, drafts, publishedPosts, pendingComments, latestPosts, latestComments] = await Promise.all([
      prisma.post.count(),
      prisma.comment.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.media.count(),
      prisma.post.aggregate({ _sum: { viewCount: true }, where: { status: PostStatus.PUBLISHED } }),
      prisma.post.count({ where: { status: PostStatus.DRAFT } }),
      prisma.post.count({ where: { status: PostStatus.PUBLISHED } }),
      prisma.comment.count({ where: { status: "PENDING" } }),
      prisma.post.findMany({
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
      prisma.comment.findMany({
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
