"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfProtection = void 0;
exports.exposeCsrfToken = exposeCsrfToken;
const csurf_1 = __importDefault(require("csurf"));
const csrfProtection = (0, csurf_1.default)({ cookie: true });
exports.csrfProtection = csrfProtection;
function exposeCsrfToken(req, res, next) {
    if (typeof req.csrfToken === "function") {
        res.locals.csrfToken = req.csrfToken();
    }
    next();
}
