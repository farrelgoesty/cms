"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const method_override_1 = __importDefault(require("method-override"));
const expressLayouts = require("express-ejs-layouts");
const auth_middleware_1 = require("./middlewares/auth.middleware");
const csrf_middleware_1 = require("./middlewares/csrf.middleware");
const error_middleware_1 = require("./middlewares/error.middleware");
const rate_limit_middleware_1 = require("./middlewares/rate-limit.middleware");
const admin_routes_1 = require("./routes/admin.routes");
const blog_routes_1 = require("./routes/blog.routes");
const seo_routes_1 = require("./routes/seo.routes");
const env_1 = require("./config/env");
exports.app = (0, express_1.default)();
exports.app.disable("x-powered-by");
exports.app.set("view engine", "ejs");
exports.app.set("views", path_1.default.join(process.cwd(), "src", "views"));
exports.app.use(expressLayouts);
exports.app.set("layout", "layouts/blog");
exports.app.use((0, helmet_1.default)({
    contentSecurityPolicy: false
}));
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.urlencoded({ extended: true }));
exports.app.use(express_1.default.json());
exports.app.use((0, method_override_1.default)("_method"));
exports.app.use(express_1.default.static("public"));
exports.app.use(auth_middleware_1.attachUser);
exports.app.use(auth_middleware_1.attachLocals);
exports.app.use((req, res, next) => {
    if (req.is("multipart/form-data")) {
        next();
        return;
    }
    (0, csrf_middleware_1.csrfProtection)(req, res, next);
});
exports.app.use(csrf_middleware_1.exposeCsrfToken);
exports.app.locals.appName = "CMS Blog";
exports.app.use("/admin", rate_limit_middleware_1.authLimiter, admin_routes_1.router);
exports.app.use("/", rate_limit_middleware_1.publicLimiter, blog_routes_1.router);
exports.app.use("/", seo_routes_1.router);
exports.app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        env: env_1.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});
exports.app.use(error_middleware_1.notFound);
exports.app.use(error_middleware_1.errorHandler);
