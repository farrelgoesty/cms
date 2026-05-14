import { postRepository } from "../repositories/post.repository";
import { buildCanonicalUrl } from "../utils/meta";
import { categoryRepository } from "../repositories/category.repository";
import { tagRepository } from "../repositories/tag.repository";

export const seoService = {
  async buildSitemap(baseUrl: string) {
    const [posts, categories, tags] = await Promise.all([
      postRepository.listPublished({ skip: 0, take: 1000 }),
      categoryRepository.list(),
      tagRepository.list()
    ]);

    const urls = [
      `${buildCanonicalUrl(baseUrl, "/")}`,
      ...posts.map((post) => buildCanonicalUrl(baseUrl, `/posts/${post.slug}`)),
      ...categories.map((item) => buildCanonicalUrl(baseUrl, `/categories/${item.slug}`)),
      ...tags.map((item) => buildCanonicalUrl(baseUrl, `/tags/${item.slug}`))
    ];

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((url) => `  <url><loc>${url}</loc></url>`)
      .join("\n")}\n</urlset>`;
  },

  buildRobots(baseUrl: string) {
    return `User-agent: *\nAllow: /\nSitemap: ${buildCanonicalUrl(baseUrl, "/sitemap.xml")}\n`;
  }
};
