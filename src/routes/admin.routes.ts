import { Router } from "express";
import { redirectIfAuth, requireAuth } from "../middlewares/auth.middleware";
import { authController } from "../controllers/admin/auth.controller";
import { dashboardController } from "../controllers/admin/dashboard.controller";
import { postController } from "../controllers/admin/post.controller";
import { mediaController } from "../controllers/admin/media.controller";
import { commentController } from "../controllers/admin/comment.controller";
import { categoryController } from "../controllers/admin/category.controller";
import { tagController } from "../controllers/admin/tag.controller";
import { profileController } from "../controllers/admin/profile.controller";
import { uploadAvatar } from "../middlewares/upload.middleware";
import { csrfProtection } from "../middlewares/csrf.middleware";

export const router = Router();

router.get("/", (_req, res) => res.redirect("/admin/dashboard"));
router.get("/login", redirectIfAuth, authController.getLogin);
router.post("/login", redirectIfAuth, authController.postLogin);
router.get("/register", redirectIfAuth, authController.getRegister);
router.post("/register", redirectIfAuth, authController.postRegister);
router.post("/logout", authController.logout);
router.get("/logout", authController.logout);

router.get("/dashboard", requireAuth, dashboardController.index);
router.get("/profile", requireAuth, profileController.index);
router.post("/profile", requireAuth, uploadAvatar.single("avatarUpload"), csrfProtection, profileController.updateProfile);
router.post("/profile/password", requireAuth, profileController.updatePassword);

router.get("/posts", requireAuth, postController.index);
router.get("/posts/create", requireAuth, postController.createForm);
router.post("/posts", requireAuth, postController.store);
router.post("/posts/taxonomies", requireAuth, postController.createTaxonomy);
router.get("/posts/:id/edit", requireAuth, postController.editForm);
router.get("/posts/:id/preview", requireAuth, postController.preview);
router.put("/posts/:id", requireAuth, postController.update);
router.patch("/posts/:id/publish", requireAuth, postController.publish);
router.patch("/posts/:id/draft", requireAuth, postController.draft);
router.delete("/posts/:id", requireAuth, postController.destroy);

router.get("/categories", requireAuth, categoryController.index);
router.post("/categories", requireAuth, categoryController.store);
router.get("/categories/:id/edit", requireAuth, categoryController.editForm);
router.put("/categories/:id", requireAuth, categoryController.update);
router.delete("/categories/:id", requireAuth, categoryController.destroy);

router.get("/tags", requireAuth, tagController.index);
router.post("/tags", requireAuth, tagController.store);
router.get("/tags/:id/edit", requireAuth, tagController.editForm);
router.put("/tags/:id", requireAuth, tagController.update);
router.delete("/tags/:id", requireAuth, tagController.destroy);

router.get("/media", requireAuth, mediaController.list);
router.get("/media/api", requireAuth, mediaController.api);
router.post("/media/upload", requireAuth, ...mediaController.upload);
router.delete("/media/:id", requireAuth, mediaController.destroy);

router.get("/comments", requireAuth, commentController.index);
router.patch("/comments/:id", requireAuth, commentController.updateStatus);
router.delete("/comments/:id", requireAuth, commentController.destroy);
