// apps/api/src/common/tasks/token-cleanup.task.ts
//
// Scheduled task: purge expired / consumed tokens once per hour.
// Keeps the token tables lean and removes any tokens that weren't cleaned up
// inline (e.g. after a server restart mid-transaction).
//
// Requires @nestjs/schedule to be installed and ScheduleModule.forRoot()
// registered in AppModule.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokenCleanupTask {
  private readonly logger = new Logger(TokenCleanupTask.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run every hour: delete tokens that are either expired OR already used.
   * Audit logs are intentionally kept — they are append-only by design.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTokens() {
    const now = new Date();

    const [resetResult, verifyResult, refreshResult] = await Promise.allSettled([
      // Password reset: expired OR already consumed
      this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { usedAt: { not: null } },
          ],
        },
      }),

      // Email verification: expired only (unused active tokens stay)
      this.prisma.emailVerificationToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),

      // Refresh tokens: expired only
      this.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ]);

    const count = (r: PromiseSettledResult<{ count: number }>) =>
      r.status === 'fulfilled' ? r.value.count : 0;

    const resetDel   = count(resetResult);
    const verifyDel  = count(verifyResult);
    const refreshDel = count(refreshResult);
    const total      = resetDel + verifyDel + refreshDel;

    if (total > 0) {
      this.logger.log(
        `Token cleanup: removed ${resetDel} reset, ${verifyDel} verification, ` +
        `${refreshDel} refresh tokens`,
      );
    }

    // Log any failures without crashing the task
    for (const [label, result] of [
      ['PasswordResetToken', resetResult],
      ['EmailVerificationToken', verifyResult],
      ['RefreshToken', refreshResult],
    ] as const) {
      if (result.status === 'rejected') {
        this.logger.error(`Cleanup failed for ${label}: ${result.reason?.message}`);
      }
    }
  }
}
