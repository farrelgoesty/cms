import { tagRepository } from "../repositories/tag.repository";

export const tagService = {
  list() {
    return tagRepository.list();
  },

  async ensureNames(names: string[]) {
    const cleanNames = names.map((name) => name.trim()).filter(Boolean);
    const tags = await Promise.all(cleanNames.map((name) => tagRepository.upsertByName(name)));
    return tags;
  },

  createOrUpdateByName(name: string) {
    return tagRepository.upsertByName(name);
  }
};
