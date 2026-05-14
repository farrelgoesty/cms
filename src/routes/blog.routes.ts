import { Router } from "express";
import { blogController } from "../controllers/blog.controller";
import { mediaController } from "../controllers/media.controller";

export const router = Router();

router.get("/media/:id/file", mediaController.show);
router.get("/media/:id/thumbnail", mediaController.thumbnail);
router.get("/", blogController.home);
router.get("/posts/:slug", blogController.showPost);
router.get("/categories/:slug", blogController.category);
router.get("/tags/:slug", blogController.tag);
router.get("/search", blogController.search);
router.post("/comments", blogController.createComment);
