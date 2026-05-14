"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.tagRepository = {
    findBySlug(slug) {
        return prisma_1.prisma.tag.findUnique({ where: { slug } });
    },
    list() {
        return prisma_1.prisma.tag.findMany({ orderBy: { name: "asc" } });
    },
    async upsertByName(name) {
        const slug = name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        return prisma_1.prisma.tag.upsert({
            where: { slug },
            update: { name: name.trim() },
            create: { name: name.trim(), slug }
        });
    }
};
