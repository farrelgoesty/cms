import { prisma } from "../config/prisma";

export const tagRepository = {
  findBySlug(slug: string) {
    return prisma.tag.findUnique({ where: { slug } });
  },

  list() {
    return prisma.tag.findMany({ orderBy: { name: "asc" } });
  },

  async upsertByName(name: string) {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return prisma.tag.upsert({
      where: { slug },
      update: { name: name.trim() },
      create: { name: name.trim(), slug }
    });
  }
};
