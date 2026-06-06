// apps/api/src/common/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { AppCacheModule } from '../cache/cache.module';

@Module({
  imports: [ConfigModule, AppCacheModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],   // so other modules can inject it
})
export class UploadModule {}
