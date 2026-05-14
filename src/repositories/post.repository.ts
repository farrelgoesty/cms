import { prisma } from "../config/prisma";
import { CommentStatus, PostStatus, Prisma } from "@prisma/client";

const postInclude = {
  author: true,
  postCategories: {
    include: { category: true }
  },
  postTags: {
    include: { tag: true }
  },
  comments: {
    where: { status: CommentStatus.APPROVED },
    orderBy: { createdAt: "desc" }
  }
} satisfies Prisma.PostInclude;

export const postRepository = {
  listCategories() {
    return prisma.category.findMany({
      orderBy: { name: "asc" }
    });
  },

  listPublishedLinkOptions(excludeId?: string) {
    return prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
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

  listAdmin(params: { skip: number; take: number; status?: PostStatus | "ALL"; q?: string }) {
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

    return prisma.post.findMany({
      ...(Object.keys(where).length ? { where } : {}),
      include: postInclude,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: params.skip,
      take: params.take
    });
  },

  countAdmin(status?: PostStatus | "ALL", q?: string) {
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
    return prisma.post.count({
      ...(Object.keys(where).length ? { where } : {})
    });
  },

  listPublished(params: { skip: number; take: number; categorySlug?: string; tagSlug?: string }) {
    return prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
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

  searchPublished(query: string, skip: number, take: number) {
    return prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
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

  countPublished(where?: Prisma.PostWhereInput) {
    return prisma.post.count({
      where: { status: PostStatus.PUBLISHED, ...(where ?? {}) }
    });
  },

  findPublishedBySlug(slug: string) {
    return prisma.post.findFirst({
      where: { slug, status: PostStatus.PUBLISHED },
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

  findById(id: string) {
    return prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        postCategories: { include: { category: true } },
        postTags: { include: { tag: true } },
        media: true
      }
    });
  },

  async create(
    data: Prisma.PostCreateInput,
    categoryIds: string[],
    tagIds: string[]
  ) {
    return prisma.post.create({
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

  async update(
    id: string,
    data: Prisma.PostUpdateInput,
    categoryIds: string[],
    tagIds: string[]
  ) {
    return prisma.$transaction([
      prisma.postCategory.deleteMany({ where: { postId: id } }),
      prisma.postTag.deleteMany({ where: { postId: id } }),
      prisma.post.update({
        where: { id },
        data
      }),
      prisma.postCategory.createMany({
        data: categoryIds.map((categoryId) => ({ postId: id, categoryId }))
      }),
      prisma.postTag.createMany({
        data: tagIds.map((tagId) => ({ postId: id, tagId }))
      })
    ]);
  },

  delete(id: string) {
    return prisma.post.delete({ where: { id } });
  },

  incrementViewCount(id: string) {
    return prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });
  },

  related(postId: string, categoryIds: string[], tagIds: string[], take = 4) {
    const hasFilters = categoryIds.length > 0 || tagIds.length > 0;
    return prisma.post.findMany({
      where: {
        id: { not: postId },
        status: PostStatus.PUBLISHED,
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
