// apps/api/src/modules/payments/errors/optimistic-lock.error.ts
//
// Thrown when a version-guarded UPDATE (WHERE id = ... AND version = ...)
// affects 0 rows — i.e. another write beat us to it since we last read the
// row. This is expected under concurrent webhook retries and must never be
// silently swallowed or blindly retried by the caller: the caller doesn't
// know what the concurrent write changed, so guessing at a retry could
// re-apply a stale transition on top of newer state. Extends
// ConflictException so it maps to HTTP 409 automatically wherever it's
// allowed to propagate (NestJS's exception filter handles the response).

import { ConflictException } from '@nestjs/common';

export class OptimisticLockError extends ConflictException {
  constructor(
    public readonly entityId: string,
    public readonly attemptedTransition: string,
    public readonly gatewayId?: string,
  ) {
    super({
      code: 'OPTIMISTIC_LOCK_CONFLICT',
      message:
        `Concurrent write conflict on ${entityId} while attempting "${attemptedTransition}". ` +
        `The record's version changed since it was last read; this write was not applied.`,
      entityId,
      attemptedTransition,
      gatewayId,
    });
  }
}
