// apps/api/src/common/monitoring/audit-log.service.ts
// Immutable audit trail: writes structured audit events to DB + stdout.
// Used for compliance (user actions, admin operations, auth events, payments).

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { traceStorage }   from '../logger/logger.service';

export enum AuditAction {
  // Auth
  USER_REGISTER        = 'USER_REGISTER',
  USER_LOGIN           = 'USER_LOGIN',
  USER_LOGOUT          = 'USER_LOGOUT',
  USER_LOGIN_FAILED    = 'USER_LOGIN_FAILED',
  PASSWORD_RESET       = 'PASSWORD_RESET',
  PASSWORD_CHANGED     = 'PASSWORD_CHANGED',
  EMAIL_VERIFIED       = 'EMAIL_VERIFIED',
  TOKEN_REFRESHED      = 'TOKEN_REFRESHED',
  // Listings
  LISTING_CREATED      = 'LISTING_CREATED',
  LISTING_UPDATED      = 'LISTING_UPDATED',
  LISTING_DELETED      = 'LISTING_DELETED',
  LISTING_APPROVED     = 'LISTING_APPROVED',
  LISTING_REJECTED     = 'LISTING_REJECTED',
  LISTING_QUARANTINED  = 'LISTING_QUARANTINED',
  // Admin
  ADMIN_USER_BANNED    = 'ADMIN_USER_BANNED',
  ADMIN_USER_UNBANNED  = 'ADMIN_USER_UNBANNED',
  ADMIN_ROLE_CHANGED   = 'ADMIN_ROLE_CHANGED',
  ADMIN_REPORT_RESOLVED= 'ADMIN_REPORT_RESOLVED',
  // Payments
  PAYMENT_INITIATED    = 'PAYMENT_INITIATED',
  PAYMENT_SUCCEEDED    = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED       = 'PAYMENT_FAILED',
  SUBSCRIPTION_CHANGED = 'SUBSCRIPTION_CHANGED',
  // Data
  PROFILE_UPDATED      = 'PROFILE_UPDATED',
  EXPORT_DATA          = 'EXPORT_DATA',
  DELETE_ACCOUNT       = 'DELETE_ACCOUNT',
}

export interface AuditEvent {
  action:      AuditAction;
  actorId?:    string;        // who performed it (null = system/anonymous)
  targetId?:   string;        // entity affected
  targetType?: string;        // 'User', 'Listing', 'Payment', etc.
  ip?:         string;
  userAgent?:  string;
  before?:     Record<string, unknown>;  // state before change
  after?:      Record<string, unknown>;  // state after change
  metadata?:   Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly isProd = process.env.NODE_ENV === 'production';

  constructor(private readonly prisma: PrismaService) {}

  async log(event: AuditEvent): Promise<void> {
    const traceCtx = traceStorage.getStore();

    const entry = {
      action:     event.action,
      actorId:    event.actorId ?? null,
      targetId:   event.targetId ?? null,
      targetType: event.targetType ?? null,
      ip:         event.ip ?? null,
      userAgent:  event.userAgent ?? null,
      traceId:    traceCtx?.traceId ?? null,
      requestId:  traceCtx?.requestId ?? null,
      before:     event.before     ? JSON.stringify(event.before)   : null,
      after:      event.after      ? JSON.stringify(event.after)    : null,
      metadata:   event.metadata   ? JSON.stringify(event.metadata) : null,
      createdAt:  new Date(),
    };

    // Write to DB (best-effort — never block the request on audit failure)
    this.writeToDb(entry).catch(err => {
      process.stderr.write(
        JSON.stringify({ level: 'error', context: 'AuditLog', message: 'DB write failed', error: err.message }) + '\n',
      );
    });

    // Always emit structured log line (captured by log aggregator)
    if (this.isProd) {
      process.stdout.write(JSON.stringify({
        level:     'log',
        timestamp: entry.createdAt.toISOString(),
        service:   'carsauto-api',
        audit:     true,
        ...entry,
        before: event.before,
        after:  event.after,
        metadata: event.metadata,
      }) + '\n');
    }
  }

  // Query audit log — used by admin dashboard
  async query(opts: {
    actorId?:   string;
    targetId?:  string;
    action?:    AuditAction;
    from?:      Date;
    to?:        Date;
    page?:      number;
    limit?:     number;
  }) {
    const { page = 1, limit = 50, from, to, actorId, targetId, action } = opts;
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (actorId)  where.actorId    = actorId;
    if (targetId) where.targetId   = targetId;
    if (action)   where.action     = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to)   where.createdAt.lte = to;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  private async writeToDb(entry: any): Promise<void> {
    await this.prisma.auditLog.create({ data: entry });
  }
}
