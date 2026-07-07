/**
 * apps/api/src/modules/ai/chat/ai-chat.controller.ts
 *
 * Prompt 3 — POST /ai/chat, GET /ai/chat/:sessionId/history.
 *
 * Auth: soft/optional. Anonymous visitors can chat (AiChatSession.userId is
 * nullable) — we don't gate behind JwtAuthGuard (which throws 401 on a
 * missing/invalid token), we just try to decode a bearer token if present
 * so a logged-in user's chat gets attributed to their account, and treat
 * anything else as anonymous. This mirrors the "userId nullable" design in
 * the schema, not a shortcut around auth.
 *
 * Throttling: @Throttle at the strictest rate anywhere in this codebase's
 * AI routes (ai.controller.ts's suggest-price is 5/min; this is even
 * tighter given the prompt calls chat "our most expensive endpoint" — each
 * turn can be 2 OpenAI calls: intent classification + grounded answer,
 * sometimes 3 with an embed() call too).
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AiChatService } from './ai-chat.service';
import { CriticalStateService } from '../../../common/cache/critical-state.service';

const MAX_SESSIONS_PER_DAY = 20;
const MAX_MESSAGE_LENGTH = 1000;

@Controller('ai/chat')
@UseGuards(ThrottlerGuard)
export class AiChatController {
  constructor(
    private readonly aiChatService: AiChatService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly criticalState: CriticalStateService,
  ) {}

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  async chat(
    @Body() body: { sessionId?: string; message?: string; locale?: string },
    @Req() req: Request,
  ) {
    const message = body?.message?.trim();
    if (!message) {
      throw new BadRequestException('message is required');
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
    }

    const ip = this.extractIp(req);
    const userId = await this.extractOptionalUserId(req);
    const locale = body?.locale ?? 'ku';

    let sessionId = body?.sessionId;

    if (!sessionId) {
      // New session — enforce the daily cap BEFORE creating one, per user
      // if authenticated, per IP otherwise (mirrors the pattern already
      // used for anonymous-safe rate limiting elsewhere — e.g.
      // SearchProtectionService keys by IP for unauthenticated traffic).
      const capKey = `aichat:sessions:${userId ?? `ip:${ip}`}:${this.todayKey()}`;
      const count = await this.criticalState.incrWithTtl(capKey, 24 * 3600 * 1000);

      if (count > MAX_SESSIONS_PER_DAY) {
        throw new HttpException(
          {
            message:
              locale === 'ku'
                ? 'گەیشتیتە سنووری زۆرترین گفتوگۆی ڕۆژانە. تکایە سبەینێ هەوڵ بدەوە.'
                : 'Daily conversation limit reached. Please try again tomorrow.',
            limitReached: true,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      sessionId = await this.aiChatService.createSession(userId, locale);
    }

    return this.aiChatService.sendMessage(sessionId, message, locale);
  }

  @Get(':sessionId/history')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async history(@Param('sessionId') sessionId: string) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }
    return this.aiChatService.getHistory(sessionId);
  }

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  private extractIp(req: Request): string {
    return (req as any).ip ?? 'unknown';
  }

  /**
   * Best-effort decode of a bearer token, if present — never throws.
   * NOTE: unlike JwtAuthGuard/JwtStrategy, this does NOT check the access-
   * token blocklist (AuthService.isAccessTokenBlocked) or the per-user
   * revocation floor — a logged-out-but-not-yet-expired token could still
   * attribute a chat session to a userId here. Acceptable for this feature
   * (worst case: a few extra chat messages attributed to an account whose
   * token was about to expire anyway) but NOT a pattern to copy for
   * anything that gates access to sensitive data — use JwtAuthGuard for that.
   */
  private async extractOptionalUserId(req: Request): Promise<string | null> {
    const header = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) return null;

    const token = header.slice('Bearer '.length);
    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        issuer: 'car-platform',
        audience: 'car-platform-client',
      });
      return payload?.sub ?? null;
    } catch {
      return null;
    }
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }
}
