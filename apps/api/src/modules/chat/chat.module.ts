import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    // PROMPT 5 FIX: ChatGateway now depends on AuthService (blocklist +
    // token-floor checks in handleConnection) — AuthModule exports
    // AuthService, and AuthModule does not import ChatModule anywhere
    // (directly or via UsersModule), so this doesn't create a cycle.
    AuthModule,
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret:      cfg.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
