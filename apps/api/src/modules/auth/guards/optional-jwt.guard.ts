// apps/api/src/modules/auth/guards/optional-jwt.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalJwtGuard — tries to authenticate via JWT but NEVER blocks the request.
 * If a valid token is present, req.user will be populated.
 * If no token (or invalid token), req.user stays undefined and the request continues.
 *
 * Usage:
 *   @UseGuards(OptionalJwtGuard)
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  // Override handleRequest so that auth failures don't throw
  handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser | false,
    _info: unknown,
    _context: ExecutionContext,
  ): TUser | undefined {
    // Return the user if valid; return undefined if not authenticated
    return user || undefined;
  }
}
