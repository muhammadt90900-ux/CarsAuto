// apps/api/src/modules/newsletter/newsletter.controller.ts
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './dto/subscribe.dto';

const THROTTLE_SUBSCRIBE = { default: { ttl: 60_000, limit: 3 } };

/**
 * Public, unauthenticated newsletter signup — backs the footer form
 * (components/shared/Footer.tsx), which previously had no backend at all:
 * the form just flipped local component state to look successful without
 * persisting anything anywhere.
 */
@ApiTags('newsletter')
@Controller('marketing/newsletter')
@UseGuards(ThrottlerGuard)
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle(THROTTLE_SUBSCRIBE)
  @ApiOperation({ summary: 'Subscribe an email address to the newsletter' })
  subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(dto);
  }
}
