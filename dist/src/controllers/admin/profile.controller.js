"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const fs_1 = __importDefault(require("fs"));
const flash_1 = require("../../utils/flash");
const profile_validation_1 = require("../../validations/profile.validation");
const user_repository_1 = require("../../repositories/user.repository");
const auth_service_1 = require("../../services/auth.service");
const sanitize_1 = require("../../utils/sanitize");
const public_url_1 = require("../../utils/public-url");
const media_service_1 = require("../../services/media.service");
function normalizeProfile(profile) {
    if (!profile) {
        return profile;
    }
    return {
        ...profile,
        avatar: (0, public_url_1.normalizePublicUrl)(profile.avatar)
    };
}
async function cleanupTempUpload(file) {
    if (file?.path) {
        await fs_1.default.promises.unlink(file.path).catch(() => undefined);
    }
}
function setAuthCookies(res, accessToken, refreshToken) {
    res.cookie("access_token", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 2
    });
    res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 30
    });
}
exports.profileController = {
    async index(req, res) {
        const profile = await user_repository_1.userRepository.findById(req.authUser.id);
        if (!profile) {
            return res.status(404).render("errors/404", { layout: "layouts/admin", title: "Not found" });
        }
        res.render("admin/profile/index", {
            layout: "layouts/admin",
            title: "Profile",
            profile: normalizeProfile(profile)
        });
    },
    async updateProfile(req, res) {
        const parsed = profile_validation_1.profileSchema.safeParse(req.body);
        if (!parsed.success) {
            const profile = await user_repository_1.userRepository.findById(req.authUser.id);
            await cleanupTempUpload(req.file);
            return res.status(422).render("admin/profile/index", {
                layout: "layouts/admin",
                title: "Profile",
                profile: normalizeProfile(profile),
                profileErrors: parsed.error.flatten().fieldErrors,
                profileValues: req.body
            });
        }
        const current = await user_repository_1.userRepository.findById(req.authUser.id);
        if (!current) {
            return res.redirect("/admin/login");
        }
        const existing = await user_repository_1.userRepository.findByEmail(parsed.data.email);
        if (existing && existing.id !== current.id) {
            const profile = await user_repository_1.userRepository.findById(req.authUser.id);
            await cleanupTempUpload(req.file);
            return res.status(409).render("admin/profile/index", {
                layout: "layouts/admin",
                title: "Profile",
                profile: normalizeProfile(profile),
                profileErrors: { email: ["Email sudah dipakai akun lain."] },
                profileValues: req.body
            });
        }
        let avatar = current.avatar;
        if (req.file) {
            const uploadedAvatar = await media_service_1.mediaService.processUpload(req.file, current.id);
            avatar = uploadedAvatar.filePath;
        }
        else if (typeof parsed.data.avatar === "string" && parsed.data.avatar.trim()) {
            avatar = (0, public_url_1.normalizePublicUrl)((0, sanitize_1.sanitizePlainText)(parsed.data.avatar));
        }
        const updated = await user_repository_1.userRepository.updateProfile(current.id, {
            name: (0, sanitize_1.sanitizePlainText)(parsed.data.name),
            email: (0, sanitize_1.sanitizePlainText)(parsed.data.email),
            avatar,
            ...(parsed.data.bio ? { bio: (0, sanitize_1.sanitizePlainText)(parsed.data.bio) } : {})
        });
        const { accessToken, refreshToken } = await (0, auth_service_1.issueSession)(updated);
        setAuthCookies(res, accessToken, refreshToken);
        return res.redirect((0, flash_1.appendNotice)("/admin/profile", "Profile berhasil diperbarui.", "success"));
    },
    async updatePassword(req, res) {
        const parsed = profile_validation_1.passwordSchema.safeParse(req.body);
        if (!parsed.success) {
            const profile = await user_repository_1.userRepository.findById(req.authUser.id);
            return res.status(422).render("admin/profile/index", {
                layout: "layouts/admin",
                title: "Profile",
                profile: normalizeProfile(profile),
                passwordErrors: parsed.error.flatten().fieldErrors,
                passwordValues: req.body
            });
        }
        const current = await user_repository_1.userRepository.findById(req.authUser.id);
        if (!current) {
            return res.redirect("/admin/login");
        }
        const valid = await bcrypt_1.default.compare(parsed.data.currentPassword, current.password);
        if (!valid) {
            const profile = await user_repository_1.userRepository.findById(req.authUser.id);
            return res.status(401).render("admin/profile/index", {
                layout: "layouts/admin",
                title: "Profile",
                profile: normalizeProfile(profile),
                passwordErrors: { currentPassword: ["Password saat ini tidak valid."] },
                passwordValues: req.body
            });
        }
        const hashedPassword = await bcrypt_1.default.hash(parsed.data.newPassword, 12);
        const updated = await user_repository_1.userRepository.updatePassword(current.id, hashedPassword);
        const { accessToken, refreshToken } = await (0, auth_service_1.issueSession)(updated);
        setAuthCookies(res, accessToken, refreshToken);
        return res.redirect((0, flash_1.appendNotice)("/admin/profile", "Password berhasil diperbarui.", "success"));
    }
};
