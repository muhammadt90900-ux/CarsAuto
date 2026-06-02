// apps/api/src/common/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],   // so other modules can inject it
})
export class UploadModule {}
