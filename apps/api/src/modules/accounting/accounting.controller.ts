// apps/api/src/modules/accounting/accounting.controller.ts

import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { AccountingService } from './accounting.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ReportQueryDto } from './dto/report-query.dto';

@ApiTags('Accounting')
@ApiBearerAuth('bearer')
@Controller()
@UseGuards(JwtAuthGuard)
export class AccountingController {
  constructor(private readonly accounting: AccountingService) {}

  @Get('expenses')
  findExpenses(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.accounting.findExpenses(req.user.userId, query);
  }

  @Post('expenses')
  @UseGuards(EmailVerifiedGuard)
  createExpense(@Request() req: any, @Body() dto: CreateExpenseDto) {
    return this.accounting.createExpense(req.user.userId, dto);
  }

  @Delete('expenses/:id')
  @UseGuards(EmailVerifiedGuard)
  deleteExpense(@Request() req: any, @Param('id') id: string) {
    return this.accounting.deleteExpense(req.user.userId, id);
  }

  @Get('accounting/profit-loss')
  getProfitLoss(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.accounting.getProfitLoss(req.user.userId, query);
  }
}
