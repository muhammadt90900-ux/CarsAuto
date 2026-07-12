/**
 * apps/api/src/modules/duplicate-detection/duplicate-detection.module.ts
 * Trust & Safety Prompt 3.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TasksModule } from '../../common/tasks/tasks.module';
import { SuspiciousActivityModule } from '../suspicious-activity/suspicious-activity.module';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { DuplicateDetectionListener } from './duplicate-detection.listener';

@Module({
  imports: [PrismaModule, TasksModule, SuspiciousActivityModule],
  providers: [DuplicateDetectionService, DuplicateDetectionListener],
  exports: [DuplicateDetectionService],
})
export class DuplicateDetectionModule {}
