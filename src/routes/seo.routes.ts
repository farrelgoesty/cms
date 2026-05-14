import { Router } from "express";
import { seoController } from "../controllers/seo.controller";

export const router = Router();

router.get("/sitemap.xml", seoController.sitemap);
router.get("/robots.txt", seoController.robots);
