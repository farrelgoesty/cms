"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagService = void 0;
const tag_repository_1 = require("../repositories/tag.repository");
exports.tagService = {
    list() {
        return tag_repository_1.tagRepository.list();
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
