"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagRepository = void 0;
const prisma_1 = require("../config/prisma");
const slugify_1 = require("../utils/slugify");
async function ensureUniqueSlug(baseSlug, excludeId) {
    let slug = baseSlug;
    let counter = 2;
    while (await prisma_1.prisma.tag.findFirst({
        where: {
            slug,
            ...(excludeId ? { id: { not: excludeId } } : {})
        },
        select: { id: true }
    })) {
        slug = `${baseSlug}-${counter}`;
        counter += 1;
    }
    return slug;
}
exports.tagRepository = {
    findBySlug(slug) {
        return prisma_1.prisma.tag.findUnique({ where: { slug } });
    },
    findById(id) {
        return prisma_1.prisma.tag.findUnique({
            where: { id }
        });
    },
    list(params) {
        return prisma_1.prisma.tag.findMany({
            include: {
                _count: {
                    select: { postTags: true }
                }
            },
            orderBy: [{ createdAt: "desc" }, { name: "asc" }],
            ...(params?.skip !== undefined ? { skip: params.skip } : {}),
            ...(params?.take !== undefined ? { take: params.take } : {})
        });
    },
    listAdmin(params) {
        const q = params?.q?.trim();
        const where = q
            ? {
                OR: [
                    { name: { contains: q } },
                    { slug: { contains: q } }
                ]
            }
            : undefined;
        return prisma_1.prisma.tag.findMany({
            include: {
                _count: {
                    select: { postTags: true }
                }
            },
            ...(where ? { where } : {}),
            orderBy: [{ createdAt: "desc" }, { name: "asc" }],
            ...(params?.skip !== undefined ? { skip: params.skip } : {}),
            ...(params?.take !== undefined ? { take: params.take } : {})
        });
    },
    count(q) {
        const search = q?.trim();
        const where = search
            ? {
                OR: [
                    { name: { contains: search } },
                    { slug: { contains: search } }
                ]
            }
            : undefined;
        return prisma_1.prisma.tag.count({
            ...(where ? { where } : {})
        });
    },
    async upsertByName(name) {
        const slug = (0, slugify_1.makeSlug)(name) || "tag";
        return prisma_1.prisma.tag.upsert({
            where: { slug },
            update: { name: name.trim() },
            create: { name: name.trim(), slug }
        });
    },
    async create(name) {
        const slug = await ensureUniqueSlug((0, slugify_1.makeSlug)(name) || "tag");
        return prisma_1.prisma.tag.create({
            data: {
                name: name.trim(),
                slug
            }
        });
    },
    async update(id, name) {
        const slug = await ensureUniqueSlug((0, slugify_1.makeSlug)(name) || "tag", id);
        return prisma_1.prisma.tag.update({
            where: { id },
            data: {
                name: name.trim(),
                slug
            }
        });
    },
    delete(id) {
        return prisma_1.prisma.tag.delete({
            where: { id }
        });
    }
};
