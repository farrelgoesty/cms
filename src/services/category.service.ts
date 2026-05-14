import { categoryRepository } from "../repositories/category.repository";

export const categoryService = {
  list() {
    return categoryRepository.list();
  },

  listAdmin(page: number, limit: number, q?: string) {
    const skip = (page - 1) * limit;
    const query = q?.trim();
    return Promise.all([
      categoryRepository.listAdmin({
        skip,
        take: limit,
        ...(query ? { q: query } : {})
      }),
      categoryRepository.count(query)
    ]).then(([items, total]) => ({ items, total }));
  },

  findById(id: string) {
    return categoryRepository.findById(id);
  },

  create(name: string) {
    return categoryRepository.create(name);
  },

  update(id: string, name: string) {
    return categoryRepository.update(id, name);
  },

  delete(id: string) {
    return categoryRepository.delete(id);
  },

  async ensureNames(names: string[]) {
    const cleanNames = names.map((name) => name.trim()).filter(Boolean);
    const categories = await Promise.all(cleanNames.map((name) => categoryRepository.upsertByName(name)));
    return categories;
  },

  createOrUpdateByName(name: string) {
    return categoryRepository.upsertByName(name);
  }
};
