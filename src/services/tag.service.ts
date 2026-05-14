import { tagRepository } from "../repositories/tag.repository";

export const tagService = {
  list() {
    return tagRepository.list();
  },

  listAdmin(page: number, limit: number, q?: string) {
    const skip = (page - 1) * limit;
    const query = q?.trim();
    return Promise.all([
      tagRepository.listAdmin({
        skip,
        take: limit,
        ...(query ? { q: query } : {})
      }),
      tagRepository.count(query)
    ]).then(([items, total]) => ({ items, total }));
  },

  findById(id: string) {
    return tagRepository.findById(id);
  },

  create(name: string) {
    return tagRepository.create(name);
  },

  update(id: string, name: string) {
    return tagRepository.update(id, name);
  },

  delete(id: string) {
    return tagRepository.delete(id);
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
