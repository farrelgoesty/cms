"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const seo_controller_1 = require("../controllers/seo.controller");
exports.router = (0, express_1.Router)();
exports.router.get("/sitemap.xml", seo_controller_1.seoController.sitemap);
exports.router.get("/robots.txt", seo_controller_1.seoController.robots);
