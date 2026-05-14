"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagService = void 0;
const tag_repository_1 = require("../repositories/tag.repository");
exports.tagService = {
    list() {
        return tag_repository_1.tagRepository.list();
    },
    listAdmin(page, limit, q) {
        const skip = (page - 1) * limit;
        const query = q?.trim();
        return Promise.all([
            tag_repository_1.tagRepository.listAdmin({
                skip,
                take: limit,
                ...(query ? { q: query } : {})
            }),
            tag_repository_1.tagRepository.count(query)
        ]).then(([items, total]) => ({ items, total }));
    },
    findById(id) {
        return tag_repository_1.tagRepository.findById(id);
    },
    create(name) {
        return tag_repository_1.tagRepository.create(name);
    },
    update(id, name) {
        return tag_repository_1.tagRepository.update(id, name);
    },
    delete(id) {
        return tag_repository_1.tagRepository.delete(id);
    },
    async ensureNames(names) {
        const cleanNames = names.map((name) => name.trim()).filter(Boolean);
        const tags = await Promise.all(cleanNames.map((name) => tag_repository_1.tagRepository.upsertByName(name)));
        return tags;
    },
    createOrUpdateByName(name) {
        return tag_repository_1.tagRepository.upsertByName(name);
    }
};
