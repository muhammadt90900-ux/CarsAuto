import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TrustProfileService } from './trust-profile.service';

@Module({
  imports: [PrismaModule],
  providers: [TrustProfileService],
  exports: [TrustProfileService],
})
export class TrustModule {}
