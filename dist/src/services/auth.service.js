"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
exports.issueSession = issueSession;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const user_repository_1 = require("../repositories/user.repository");
const prisma_1 = require("../config/prisma");
const jwt_1 = require("../utils/jwt");
function hashToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
async function issueSession(user) {
    const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
    };
    const accessToken = (0, jwt_1.signAccessToken)(payload);
    const refreshToken = (0, jwt_1.signRefreshToken)(payload);
    await prisma_1.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() }
    });
    await prisma_1.prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: hashToken(refreshToken),
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
        }
    });
    return { accessToken, refreshToken };
}
exports.authService = {
    async login(email, password) {
        const user = await user_repository_1.userRepository.findByEmail(email);
        if (!user || user.role !== "ADMIN") {
            throw new Error("Email atau password tidak valid.");
        }
        const valid = await bcrypt_1.default.compare(password, user.password);
        if (!valid) {
            throw new Error("Email atau password tidak valid.");
        }
        const { accessToken, refreshToken } = await issueSession(user);
        return { user, accessToken, refreshToken };
    },
    async register(input) {
        const existing = await user_repository_1.userRepository.findByEmail(input.email);
        if (existing) {
            throw new Error("Email sudah terdaftar. Silakan login atau gunakan email lain.");
        }
        const hashedPassword = await bcrypt_1.default.hash(input.password, 12);
        const user = await user_repository_1.userRepository.create({
            name: input.name,
            email: input.email,
            password: hashedPassword,
            role: "ADMIN"
        });
        const { accessToken, refreshToken } = await issueSession(user);
        return { user, accessToken, refreshToken };
    },
    async revokeRefreshToken(token) {
        if (!token)
            return;
        await prisma_1.prisma.refreshToken.updateMany({
            where: { token: hashToken(token) },
            data: { revokedAt: new Date() }
        });
    }
};
