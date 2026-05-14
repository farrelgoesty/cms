"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachUser = attachUser;
exports.requireAuth = requireAuth;
exports.redirectIfAuth = redirectIfAuth;
exports.attachLocals = attachLocals;
const jwt_1 = require("../utils/jwt");
const user_repository_1 = require("../repositories/user.repository");
const public_url_1 = require("../utils/public-url");
function attachUser(req, _res, next) {
    const token = req.cookies?.access_token;
    if (!token) {
        next();
        return;
    }
    try {
        req.authUser = (0, jwt_1.verifyAccessToken)(token);
    }
    catch {
        req.authUser = undefined;
    }
    next();
}
function requireAuth(req, res, next) {
    if (!req.authUser) {
        res.redirect("/admin/login");
        return;
    }
    next();
}
function redirectIfAuth(req, res, next) {
    if (req.authUser) {
        res.redirect("/admin/dashboard");
        return;
    }
    next();
}
async function attachLocals(req, res, next) {
    if (req.authUser) {
        const user = await user_repository_1.userRepository.findById(req.authUser.id);
        res.locals.user = user
            ? {
                ...req.authUser,
                avatar: (0, public_url_1.normalizePublicUrl)(user.avatar)
            }
            : req.authUser;
    }
    else {
        res.locals.user = undefined;
    }
    res.locals.currentYear = new Date().getFullYear();
    res.locals.currentPath = req.path;
    res.locals.notice = typeof req.query.notice === "string" ? req.query.notice.trim() : "";
    res.locals.noticeType = typeof req.query.noticeType === "string" ? req.query.noticeType.trim() : "";
    next();
}
