// apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { AuthService } from '../auth.service';

/**
 * Custom strategy that reads the refresh token from an httpOnly cookie.
 * Used exclusively on POST /auth/refresh.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly cfg: ConfigService,
    private readonly authService: AuthService,
  ) {
    super();
  }

  async validate(req: Request) {
    const token: string | undefined = req.cookies?.['refresh_token'];
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return token; // raw token passed to the controller
  }
}
