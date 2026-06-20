// apps/api/src/common/throttler/throttler.module.ts
//
// Centralised security / rate-limiting module.
// Import this in AppModule to make all services globally available,
// and register IpThrottleMiddleware as application-level middleware.

import { Module, Global } from '@nestjs/common';
import { ThrottlerStorageService } from './throttler-storage.service';
import { OtpProtectionService }    from './otp-protection.service';
import { SearchProtectionService } from './search-protection.service';
import { IpThrottleMiddleware }    from './ip-throttle.middleware';

@Global()
@Module({
  providers: [
    ThrottlerStorageService,
    OtpProtectionService,
    SearchProtectionService,
    IpThrottleMiddleware,
  ],
  exports: [
    ThrottlerStorageService,
    OtpProtectionService,
    SearchProtectionService,
    IpThrottleMiddleware,
  ],
})
export class SecurityThrottlerModule {}
