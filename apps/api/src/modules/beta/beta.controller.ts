// apps/api/src/modules/beta/beta.controller.ts
import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BetaService } from './beta.service';
import { RegisterBetaDto } from './dto/register-beta.dto';
import { UpdateBetaStatusDto } from './dto/update-beta-status.dto';
import { BetaQueryDto } from './dto/beta-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

const THROTTLE_REGISTER = { default: { ttl: 60_000, limit: 5 } };

@ApiTags('beta')
@Controller('beta')
export class BetaController {
  constructor(private readonly betaService: BetaService) {}

  // ── Public ─────────────────────────────────────────────────────────────

  /** POST /beta/register — public, unauthenticated "Join Beta" submission. */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle(THROTTLE_REGISTER)
  @ApiOperation({ summary: 'Submit a Beta / early-access dealer registration' })
  register(@Body() dto: RegisterBetaDto) {
    return this.betaService.register(dto);
  }

  // ── Admin ──────────────────────────────────────────────────────────────

  /** GET /beta/registrations — admin list, search, filter, paginate. */
  @Get('registrations')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'List Beta registrations (admin)' })
  findAll(@Query() query: BetaQueryDto) {
    return this.betaService.findAll(query);
  }

  /** GET /beta/registrations/pending-count — used for the admin sidebar badge. */
  @Get('registrations/pending-count')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Count of pending Beta registrations (admin)' })
  async pendingCount() {
    return { count: await this.betaService.getPendingCount() };
  }

  /** PATCH /beta/registrations/:id/status — admin status change. */
  @Patch('registrations/:id/status')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update a Beta registration status (admin)' })
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBetaStatusDto) {
    return this.betaService.updateStatus(id, dto);
  }
}
