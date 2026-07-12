/**
 * apps/api/src/modules/verification/verification.module.ts
 *
 * Trust & Safety Prompt 2. EmailVerifiedGuard is added directly to
 * `providers` here (not via importing the full AuthModule) — this mirrors
 * DealersModule's existing convention for the same guard: it only needs
 * PrismaService + Nest's globally-available Reflector, so re-declaring it
 * locally avoids pulling in AuthModule's JwtModule/PassportModule/etc. for
 * a module that doesn't otherwise need them. AdminGuard is NOT listed here,
 * same as FraudModule's precedent — it has no constructor dependencies, so
 * Nest resolves it without a provider registration.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { UploadModule } from '../../common/upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { AdminVerificationController } from './admin-verification.controller';

@Module({
  imports: [PrismaModule, UploadModule, NotificationsModule],
  controllers: [VerificationController, AdminVerificationController],
  providers: [VerificationService, EmailVerifiedGuard],
  exports: [VerificationService],
})
export class VerificationModule {}
