/**
 * apps/api/src/modules/payments/admin-transactions.controller.ts
 *
 * ADMIN FIX: the admin/transactions frontend page (apps/web/src/app/[locale]/
 * admin/transactions/page.tsx) called GET /admin/transactions and GET
 * /admin/transactions/:id, but PaymentsController only ever exposed
 * user-scoped /payments/* routes — no admin-prefixed route existed. Every
 * load of this admin page 404'd.
 *
 * Kept as its own small controller (mounted at /admin/transactions) rather
 * than merged into PaymentsController, mirroring the existing
 * AdminVerificationController / AdminSuspiciousActivityController precedent —
 * reuses the same guard stack (JwtAuthGuard + AdminGuard).
 */

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PaymentsService } from './payments.service';

@ApiTags('admin-transactions')
@ApiBearerAuth('bearer')
@Controller('admin/transactions')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminTransactionsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /** GET /admin/transactions?page=1&limit=20&status=&gateway=&search= */
  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('gateway') gateway?: string,
    @Query('search') search?: string,
  ) {
    return this.paymentsService.adminListTransactions({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      gateway,
      search,
    });
  }

  /** GET /admin/transactions/:id */
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.paymentsService.adminGetTransaction(id);
  }
}
