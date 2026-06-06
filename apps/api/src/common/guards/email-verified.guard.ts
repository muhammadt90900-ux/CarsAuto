// apps/api/src/common/guards/email-verified.guard.ts
//
// Use this guard on any endpoint that requires a verified email.
// Always pair with JwtAuthGuard (or apply after it), because this guard
// reads req.user which is populated by the JWT strategy.
//
// Usage:
//   @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
//   @Post('sensitive-action')
//   ...
//
// To skip verification for a specific route (e.g. the verify endpoint itself),
// add @SkipEmailVerification() decorator.

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

export const SKIP_EMAIL_VERIFICATION_KEY = 'skipEmailVerification';

/** Decorator — apply to a route to bypass the EmailVerifiedGuard check. */
export const SkipEmailVerification = () =>
  SetMetadata(SKIP_EMAIL_VERIFICATION_KEY, true);

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow routes explicitly decorated with @SkipEmailVerification()
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_EMAIL_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string; email: string; role: string } | undefined;

    // If no user on request, let JwtAuthGuard handle the 401
    if (!user?.userId) return true;

    // ADMINs bypass email verification (they are created by other admins)
    if (user.role === 'ADMIN') return true;

    // Fast check using the DB — the JWT payload does not carry `verified`
    // to avoid stale tokens letting unverified users through after a reset.
    const record = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { verified: true },
    });

    if (!record?.verified) {
      throw new ForbiddenException(
        'ئیمەیڵەکەت پشتڕاست نەکراوە. تکایە ئیمەیڵەکەت بپشتڕاست بکە. / ' +
          'Email not verified. Please verify your email address before continuing.',
      );
    }

    return true;
  }
}
