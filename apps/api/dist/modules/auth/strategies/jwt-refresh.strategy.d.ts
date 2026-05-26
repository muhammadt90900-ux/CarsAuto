import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { AuthService } from '../auth.service';
declare const JwtRefreshStrategy_base: new (...args: any[]) => Strategy;
/**
 * Custom strategy that reads the refresh token from an httpOnly cookie.
 * Used exclusively on POST /auth/refresh.
 */
export declare class JwtRefreshStrategy extends JwtRefreshStrategy_base {
    private readonly cfg;
    private readonly authService;
    constructor(cfg: ConfigService, authService: AuthService);
    validate(req: Request): Promise<string>;
}
export {};
