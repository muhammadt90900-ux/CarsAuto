import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { SearchIndexingModule } from '../search-indexing/search-index.module';

@Module({
  // PROMPT 4 FIX: AdminService now depends on AuthService (to call
  // revokeTokensIssuedBefore() from banUser/suspendUser/setUserRole) —
  // AuthModule exports AuthService, and AuthModule does not import
  // AdminModule anywhere, so this doesn't create a circular dependency.
  //
  // Search Architecture Phase 1: SearchIndexingModule exports the
  // 'search-index' BullMQ queue so triggerSearchReindex() below can
  // @InjectQueue it directly, reusing the same queue the event listener
  // enqueues onto (see search-index.module.ts's export comment).
  imports: [PrismaModule, NotificationsModule, AuthModule, SearchIndexingModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
