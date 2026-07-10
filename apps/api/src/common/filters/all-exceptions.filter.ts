// apps/api/src/common/filters/all-exceptions.filter.ts
// Global exception filter: structured JSON error responses + error tracking + metrics.

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError, PrismaClientInitializationError, PrismaClientRustPanicError } from '@prisma/client/runtime/library';
import { ErrorTrackerService } from '../monitoring/error-tracker.service';
import { MetricsService }      from '../monitoring/metrics.service';
import { StructuredLogger }    from '../logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new StructuredLogger();

  constructor(
    @Optional() @Inject(ErrorTrackerService) private readonly tracker?: ErrorTrackerService,
    @Optional() @Inject(MetricsService)      private readonly metrics?: MetricsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx    = host.switchToHttp();
    const req    = ctx.getRequest<Request>();
    const res    = ctx.getResponse<Response>();
    const isProd = process.env.NODE_ENV === 'production';

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code    = 'INTERNAL_ERROR';
    let shouldTrack = true;

    // ── HttpException ──────────────────────────────────────────────────────
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string | string[]) ?? exception.message;
        code    = (b.error as string) ?? exception.name;
      }
      // 4xx are not bugs — don't track, just log
      shouldTrack = status >= 500;
      if (status < 500) {
        this.logger.debug(`[${status}] ${req.method} ${req.url} — ${JSON.stringify(message)}`, 'ExceptionFilter');
      } else {
        this.logger.error(`[${status}] ${req.method} ${req.url}`, exception instanceof Error ? exception.stack : String(exception), 'ExceptionFilter');
      }
    }
    // ── Prisma known errors ────────────────────────────────────────────────
    else if (exception instanceof PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': status = HttpStatus.CONFLICT;             message = 'A record with this value already exists'; code = 'DUPLICATE_ENTRY'; break;
        case 'P2025': status = HttpStatus.NOT_FOUND;            message = 'Record not found';                        code = 'NOT_FOUND';       break;
        case 'P2003': status = HttpStatus.BAD_REQUEST;          message = 'Foreign key constraint violation';        code = 'FK_VIOLATION';    break;
        default:      status = HttpStatus.UNPROCESSABLE_ENTITY; message = 'Database operation failed';               code = `PRISMA_${exception.code}`;
      }
      shouldTrack = false; // Prisma errors are usually user/input errors
      this.logger.error(`Prisma ${exception.code} on ${req.method} ${req.url}`, isProd ? exception.code : exception.message, 'ExceptionFilter');
    }
    // ── Prisma connection / panic ──────────────────────────────────────────
    else if (
      exception instanceof PrismaClientInitializationError ||
      exception instanceof PrismaClientRustPanicError
    ) {
      status  = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Database unavailable';
      code    = 'DB_UNAVAILABLE';
      this.logger.error('Prisma critical error', (exception as Error).message, 'ExceptionFilter');
    }
    // ── Generic Error ──────────────────────────────────────────────────────
    else if (exception instanceof Error) {
      this.logger.error(`Unhandled: ${req.method} ${req.url}`, isProd ? exception.message : exception.stack, 'ExceptionFilter');
    }

    // ── Error tracking (5xx only) ──────────────────────────────────────────
    if (shouldTrack && this.tracker && exception instanceof Error) {
      // PROMPT 3: req.user is populated by the JWT strategy for
      // authenticated requests (see email-verified.guard.ts for the same
      // shape) — only the id is forwarded, never the full user object or
      // request body, so no PII/payment data reaches Sentry from here.
      const authUser = (req as any).user as { userId: string } | undefined;
      this.tracker.capture({
        error:   exception,
        context: 'ExceptionFilter',
        userId:  authUser?.userId,
        extra:   {
          method:     req.method,
          url:        req.url,
          statusCode: status,
          ip:         req.ip,
        },
      });
    }

    // ── Metrics ───────────────────────────────────────────────────────────
    if (this.metrics) {
      this.metrics.errorsTotal.inc({
        type:    status >= 500 ? 'server_error' : 'client_error',
        code:    String(status),
        context: 'exception_filter',
      });
    }

    // ── Response ──────────────────────────────────────────────────────────
    const body: Record<string, unknown> = {
      statusCode: status,
      code,
      message,
      path:      req.url,
      timestamp: new Date().toISOString(),
    };
    if (!isProd && exception instanceof Error) body.stack = exception.stack;

    res.status(status).json(body);
  }
}
