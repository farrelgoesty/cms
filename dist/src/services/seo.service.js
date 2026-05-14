"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seoService = void 0;
const post_repository_1 = require("../repositories/post.repository");
const meta_1 = require("../utils/meta");
const category_repository_1 = require("../repositories/category.repository");
const tag_repository_1 = require("../repositories/tag.repository");
exports.seoService = {
    async buildSitemap(baseUrl) {
        const [posts, categories, tags] = await Promise.all([
            post_repository_1.postRepository.listPublished({ skip: 0, take: 1000 }),
            category_repository_1.categoryRepository.list(),
            tag_repository_1.tagRepository.list()
        ]);
        const urls = [
            `${(0, meta_1.buildCanonicalUrl)(baseUrl, "/")}`,
            ...posts.map((post) => (0, meta_1.buildCanonicalUrl)(baseUrl, `/posts/${post.slug}`)),
            ...categories.map((item) => (0, meta_1.buildCanonicalUrl)(baseUrl, `/categories/${item.slug}`)),
            ...tags.map((item) => (0, meta_1.buildCanonicalUrl)(baseUrl, `/tags/${item.slug}`))
        ];
        return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
            .map((url) => `  <url><loc>${url}</loc></url>`)
            .join("\n")}\n</urlset>`;
    },
    buildRobots(baseUrl) {
        return `User-agent: *\nAllow: /\nSitemap: ${(0, meta_1.buildCanonicalUrl)(baseUrl, "/sitemap.xml")}\n`;
    }
};
