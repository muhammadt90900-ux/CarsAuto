"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
// apps/api/src/modules/auth/auth.service.ts
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("@/prisma/prisma.service");
const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1_000; // 15 minutes
const REFRESH_TOKEN_BYTES = 64;
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwt, cfg) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.cfg = cfg;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    // ── Register ─────────────────────────────────────────────────────────────
    async register(dto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
            select: { id: true },
        });
        if (existing) {
            throw new common_1.ConflictException('ئەم ئیمەیڵە پێشتر تۆمار کراوە / Email already registered');
        }
        const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email.toLowerCase(),
                password: hash,
                ...(dto.phone ? { phone: dto.phone } : {}),
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                verified: true,
            },
        });
        this.logger.log(`New user registered: ${user.id}`);
        return this.issueTokenPair(user);
    }
    // ── Login ─────────────────────────────────────────────────────────────────
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                verified: true,
                password: true,
                failedLoginAttempts: true,
                lockedUntil: true,
            },
        });
        // ── Account lockout check ───────────────────────────────────────────────
        if (user?.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
            throw new common_1.ForbiddenException(`ئەکاونتەکەت کلاو کراوەتەوە. ${minutesLeft} خولەک دوا دوبارە هەوڵ بدەوە / ` +
                `Account locked. Try again in ${minutesLeft} minute(s).`);
        }
        // ── Credential check (always run bcrypt to prevent timing attacks) ──────
        const validPassword = user?.password && (await bcrypt.compare(dto.password, user.password));
        if (!user || !validPassword) {
            if (user)
                await this.recordFailedLogin(user.id, user.failedLoginAttempts);
            // Uniform error — do NOT distinguish "no user" from "wrong password"
            throw new common_1.UnauthorizedException('ئیمەیڵ یان پاسوۆرد هەڵەیە / Invalid email or password');
        }
        // ── Success — reset failed-login counter ────────────────────────────────
        if (user.failedLoginAttempts > 0) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedUntil: null },
            });
        }
        this.logger.log(`User logged in: ${user.id}`);
        const { password: _pw, failedLoginAttempts: _fa, lockedUntil: _lu, ...safeUser } = user;
        return this.issueTokenPair(safeUser);
    }
    // ── Refresh token rotation ────────────────────────────────────────────────
    async refreshTokens(rawToken) {
        if (!rawToken) {
            throw new common_1.UnauthorizedException('Refresh token missing');
        }
        const tokenHash = this.hashToken(rawToken);
        const stored = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                        verified: true,
                        lockedUntil: true,
                    },
                },
            },
        });
        if (!stored || stored.expiresAt < new Date()) {
            // Possible token reuse — revoke all tokens for this family
            if (stored) {
                await this.prisma.refreshToken.deleteMany({
                    where: { userId: stored.userId },
                });
                this.logger.warn(`Refresh token reuse detected for user ${stored.userId}`);
            }
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        if (stored.user.lockedUntil && stored.user.lockedUntil > new Date()) {
            throw new common_1.ForbiddenException('Account is locked');
        }
        // ── Rotate: delete old, issue new ──────────────────────────────────────
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
        return this.issueTokenPair(stored.user);
    }
    // ── Revoke refresh token (logout) ─────────────────────────────────────────
    async revokeRefreshToken(rawToken) {
        const tokenHash = this.hashToken(rawToken);
        await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    }
    // ── Internal helpers ──────────────────────────────────────────────────────
    async issueTokenPair(user) {
        const payload = { sub: user.id, email: user.email, role: user.role };
        const access_token = this.jwt.sign(payload);
        // Generate a cryptographically secure refresh token
        const rawRefresh = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
        const tokenHash = this.hashToken(rawRefresh);
        const expiresAt = new Date(Date.now() +
            this.parseDuration(this.cfg.get('JWT_REFRESH_EXPIRES_IN', '7d')));
        await this.prisma.refreshToken.create({
            data: { userId: user.id, tokenHash, expiresAt },
        });
        // Prune old tokens (keep last 5 per user to handle multi-device)
        await this.pruneOldRefreshTokens(user.id);
        return {
            access_token,
            refresh_token: rawRefresh,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone ?? null,
                role: user.role,
                verified: user.verified,
            },
        };
    }
    async recordFailedLogin(userId, currentAttempts) {
        const newCount = currentAttempts + 1;
        const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: newCount,
                ...(shouldLock
                    ? { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) }
                    : {}),
            },
        });
        if (shouldLock) {
            this.logger.warn(`Account locked due to failed attempts: ${userId}`);
        }
    }
    async pruneOldRefreshTokens(userId) {
        const tokens = await this.prisma.refreshToken.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        });
        if (tokens.length > 5) {
            const idsToDelete = tokens.slice(5).map((t) => t.id);
            await this.prisma.refreshToken.deleteMany({ where: { id: { in: idsToDelete } } });
        }
    }
    hashToken(raw) {
        return crypto.createHash('sha256').update(raw).digest('hex');
    }
    /** Parse duration string like '7d', '15m', '1h' to milliseconds */
    parseDuration(str) {
        const units = {
            s: 1_000,
            m: 60_000,
            h: 3_600_000,
            d: 86_400_000,
        };
        const match = str.match(/^(\d+)([smhd])$/);
        if (!match)
            return 7 * 86_400_000;
        return parseInt(match[1], 10) * (units[match[2]] ?? 86_400_000);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaService !== "undefined" && prisma_service_1.PrismaService) === "function" ? _a : Object, jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
