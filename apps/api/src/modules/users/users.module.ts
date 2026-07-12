import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TrustModule } from '../../common/trust/trust.module';

@Module({
  imports: [PrismaModule, TrustModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
