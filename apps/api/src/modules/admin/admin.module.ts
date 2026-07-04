import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  // PROMPT 4 FIX: AdminService now depends on AuthService (to call
  // revokeTokensIssuedBefore() from banUser/suspendUser/setUserRole) —
  // AuthModule exports AuthService, and AuthModule does not import
  // AdminModule anywhere, so this doesn't create a circular dependency.
  imports: [PrismaModule, NotificationsModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
