"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryService = void 0;
const category_repository_1 = require("../repositories/category.repository");
exports.categoryService = {
    list() {
        return category_repository_1.categoryRepository.list();
    },
    listAdmin(page, limit, q) {
        const skip = (page - 1) * limit;
        const query = q?.trim();
        return Promise.all([
            category_repository_1.categoryRepository.listAdmin({
                skip,
                take: limit,
                ...(query ? { q: query } : {})
            }),
            category_repository_1.categoryRepository.count(query)
        ]).then(([items, total]) => ({ items, total }));
    },
    findById(id) {
        return category_repository_1.categoryRepository.findById(id);
    },
    create(name) {
        return category_repository_1.categoryRepository.create(name);
    },
    update(id, name) {
        return category_repository_1.categoryRepository.update(id, name);
    },
    delete(id) {
        return category_repository_1.categoryRepository.delete(id);
    },
    async ensureNames(names) {
        const cleanNames = names.map((name) => name.trim()).filter(Boolean);
        const categories = await Promise.all(cleanNames.map((name) => category_repository_1.categoryRepository.upsertByName(name)));
        return categories;
    },
    createOrUpdateByName(name) {
        return category_repository_1.categoryRepository.upsertByName(name);
    }
};
