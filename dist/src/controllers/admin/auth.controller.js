"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("../../services/auth.service");
const auth_validation_1 = require("../../validations/auth.validation");
const flash_1 = require("../../utils/flash");
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
exports.authController = {
    getLogin(req, res) {
        res.render("admin/auth/login", {
            layout: "layouts/admin",
            title: "Admin Login",
            authPage: true
        });
    },
    getRegister(req, res) {
        res.render("admin/auth/register", {
            layout: "layouts/admin",
            title: "Register Admin",
            authPage: true
        });
    },
    async postLogin(req, res) {
        const parsed = auth_validation_1.loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(422).render("admin/auth/login", {
                layout: "layouts/admin",
                title: "Admin Login",
                authPage: true,
                notice: "Periksa kembali email dan password Anda.",
                noticeType: "warning",
                errors: parsed.error.flatten().fieldErrors,
                values: req.body
            });
        }
        try {
            const result = await auth_service_1.authService.login(parsed.data.email, parsed.data.password);
            setAuthCookies(res, result.accessToken, result.refreshToken);
            return res.redirect((0, flash_1.appendNotice)("/admin/dashboard", "Login berhasil.", "success"));
        }
        catch (error) {
            return res.status(401).render("admin/auth/login", {
                layout: "layouts/admin",
                title: "Admin Login",
                authPage: true,
                notice: error instanceof Error ? error.message : "Login gagal",
                noticeType: "error",
                error: error instanceof Error ? error.message : "Login failed",
                values: req.body
            });
        }
    },
    async postRegister(req, res) {
        const parsed = auth_validation_1.registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(422).render("admin/auth/register", {
                layout: "layouts/admin",
                title: "Register Admin",
                authPage: true,
                notice: "Periksa kembali data registrasi Anda.",
                noticeType: "warning",
                errors: parsed.error.flatten().fieldErrors,
                values: req.body
            });
        }
        try {
            await auth_service_1.authService.register(parsed.data);
            return res.redirect((0, flash_1.appendNotice)("/admin/login", "Registrasi berhasil. Silakan login.", "success"));
        }
        catch (error) {
            return res.status(409).render("admin/auth/register", {
                layout: "layouts/admin",
                title: "Register Admin",
                authPage: true,
                notice: error instanceof Error ? error.message : "Registrasi gagal",
                noticeType: "error",
                error: error instanceof Error ? error.message : "Registrasi gagal",
                values: req.body
            });
        }
    },
    async logout(req, res) {
        await auth_service_1.authService.revokeRefreshToken(req.cookies?.refresh_token);
        res.clearCookie("access_token");
        res.clearCookie("refresh_token");
        res.redirect((0, flash_1.appendNotice)("/admin/login", "Logout berhasil.", "info"));
    }
};
