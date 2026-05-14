import { prisma } from "../config/prisma";
import { makeSlug } from "../utils/slugify";

async function ensureUniqueSlug(baseSlug: string, excludeId?: string) {
  let slug = baseSlug;
  let counter = 2;

  while (
    await prisma.category.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {})
      },
      select: { id: true }
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

export const categoryRepository = {
  findBySlug(slug: string) {
    return prisma.category.findUnique({ where: { slug } });
  },

  findById(id: string) {
    return prisma.category.findUnique({
      where: { id }
    });
  },

  list(params?: { skip?: number; take?: number }) {
    return prisma.category.findMany({
      include: {
        _count: {
          select: { postCategories: true }
        }
      },
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
      ...(params?.skip !== undefined ? { skip: params.skip } : {}),
      ...(params?.take !== undefined ? { take: params.take } : {})
    });
  },

  listAdmin(params?: { skip?: number; take?: number; q?: string }) {
    const q = params?.q?.trim();
    const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { slug: { contains: q } }
          ]
        }
      : undefined;

    return prisma.category.findMany({
      include: {
        _count: {
          select: { postCategories: true }
        }
      },
      ...(where ? { where } : {}),
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
      ...(params?.skip !== undefined ? { skip: params.skip } : {}),
      ...(params?.take !== undefined ? { take: params.take } : {})
    });
  },

  count(q?: string) {
    const search = q?.trim();
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { slug: { contains: search } }
          ]
        }
      : undefined;

    return prisma.category.count({
      ...(where ? { where } : {})
    });
  },

  async upsertByName(name: string) {
    const slug = makeSlug(name) || "category";

    return prisma.category.upsert({
      where: { slug },
      update: { name: name.trim() },
      create: { name: name.trim(), slug }
    });
  },

  async create(name: string) {
    const slug = await ensureUniqueSlug(makeSlug(name) || "category");
    return prisma.category.create({
      data: {
        name: name.trim(),
        slug
      }
    });
  },

  async update(id: string, name: string) {
    const slug = await ensureUniqueSlug(makeSlug(name) || "category", id);
    return prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        slug
      }
    });
  },

  delete(id: string) {
    return prisma.category.delete({
      where: { id }
    });
  }
};
