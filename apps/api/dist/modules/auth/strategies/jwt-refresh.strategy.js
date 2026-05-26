"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtRefreshStrategy = void 0;
// apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const passport_custom_1 = require("passport-custom");
const auth_service_1 = require("../auth.service");
/**
 * Custom strategy that reads the refresh token from an httpOnly cookie.
 * Used exclusively on POST /auth/refresh.
 */
let JwtRefreshStrategy = class JwtRefreshStrategy extends (0, passport_1.PassportStrategy)(passport_custom_1.Strategy, 'jwt-refresh') {
    constructor(cfg, authService) {
        super();
        this.cfg = cfg;
        this.authService = authService;
    }
    async validate(req) {
        const token = req.cookies?.['refresh_token'];
        if (!token) {
            throw new common_1.UnauthorizedException('Refresh token missing');
        }
        return token; // raw token passed to the controller
    }
};
exports.JwtRefreshStrategy = JwtRefreshStrategy;
exports.JwtRefreshStrategy = JwtRefreshStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        auth_service_1.AuthService])
], JwtRefreshStrategy);
