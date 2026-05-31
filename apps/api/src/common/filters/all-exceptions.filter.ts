// apps/api/src/common/filters/all-exceptions.filter.ts
// Global exception filter: structured JSON error responses + production-safe logging

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx    = host.switchToHttp();
    const req    = ctx.getRequest<Request>();
    const res    = ctx.getResponse<Response>();
    const isProd = process.env.NODE_ENV === 'production';

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code    = 'INTERNAL_ERROR';

    // ── HttpException (NestJS / class-validator) ───────────────────────────
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
      // 4xx: debug level; 5xx: error level
      if (status < 500) {
        this.logger.debug(
          `[${status}] ${req.method} ${req.url} — ${JSON.stringify(message)}`,
        );
      } else {
        this.logger.error(
          `[${status}] ${req.method} ${req.url}`,
          exception instanceof Error ? exception.stack : String(exception),
        );
      }
    }
    // ── Prisma known errors ────────────────────────────────────────────────
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status  = HttpStatus.CONFLICT;
          message = 'A record with this value already exists';
          code    = 'DUPLICATE_ENTRY';
          break;
        case 'P2025':
          status  = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          code    = 'NOT_FOUND';
          break;
        case 'P2003':
          status  = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint violation';
          code    = 'FK_VIOLATION';
          break;
        default:
          status  = HttpStatus.UNPROCESSABLE_ENTITY;
          message = 'Database operation failed';
          code    = `PRISMA_${exception.code}`;
      }
      this.logger.error(
        `Prisma ${exception.code} on ${req.method} ${req.url}`,
        isProd ? exception.code : exception.message,
      );
    }
    // ── Prisma connection / unknown DB errors ──────────────────────────────
    else if (exception instanceof Prisma.PrismaClientInitializationError ||
             exception instanceof Prisma.PrismaClientRustPanicError) {
      status  = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Database unavailable';
      code    = 'DB_UNAVAILABLE';
      this.logger.error('Prisma critical error', (exception as Error).message);
    }
    // ── Generic Error ──────────────────────────────────────────────────────
    else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled: ${req.method} ${req.url}`,
        isProd ? exception.message : exception.stack,
      );
    }

    // ── Response body ──────────────────────────────────────────────────────
    const body: Record<string, unknown> = {
      statusCode: status,
      code,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    };

    // Attach stack trace in non-production for easier debugging
    if (!isProd && exception instanceof Error) {
      body.stack = exception.stack;
    }

    res.status(status).json(body);
  }
}
