"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seoController = void 0;
const seo_service_1 = require("../services/seo.service");
exports.seoController = {
    async sitemap(req, res) {
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const xml = await seo_service_1.seoService.buildSitemap(baseUrl);
        res.type("application/xml").send(xml);
    },
    robots(req, res) {
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        res.type("text/plain").send(seo_service_1.seoService.buildRobots(baseUrl));
    }
};
