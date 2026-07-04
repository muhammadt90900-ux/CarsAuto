// apps/api/src/modules/auth/strategies/jwt.strategy.ts
//
// F2 FIX: JwtStrategy.validate() now checks the access-token blocklist so
// that tokens invalidated at logout (written by AuthService.revokeRefreshToken)
// are actually rejected.
//
// Two changes from the original:
//   1. `passReqToCallback: true` added to super() options so validate()
//      receives the raw Request and can extract the bearer token string.
//   2. `forwardRef(() => AuthService)` injection to break the circular
//      dependency AuthModule ↔ JwtStrategy (both live in the same module,
//      so a direct inject would cause a NestJS circular-dep error at startup).

import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly cfg: ConfigService,
    // forwardRef breaks the circular dependency:
    //   AuthModule provides both AuthService and JwtStrategy,
    //   and AuthService is exported — without forwardRef NestJS
    //   cannot resolve the dependency graph at startup.
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {
    super({
      // passReqToCallback: true makes Passport pass the raw Request as the
      // first argument to validate(), which lets us extract the bearer token
      // string and check it against the Redis blocklist.
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.getOrThrow<string>('JWT_SECRET'),
      issuer: 'car-platform',
      audience: 'car-platform-client',
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // F2 FIX: Check the blocklist that AuthService.revokeRefreshToken() populates
    // on logout. Without this check the blocklist is dead code — a logged-out
    // access token remains usable until its natural 15-minute expiry.
    const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (rawToken && (await this.authService.isAccessTokenBlocked(rawToken))) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // PROMPT 4 FIX: Check the per-user token floor that AdminService populates
    // via banUser/suspendUser/setUserRole. Without this, banning or role-changing
    // a user only deleted their refresh tokens — their currently-live access
    // token (up to 15 min old) kept working with the stale role/ban-state baked
    // into its payload until it expired naturally.
    if (await this.authService.isAccessTokenRevokedForUser(payload.sub, payload.iat)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
