import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  getAll(@Request() req: any) {
    return this.paymentsService.getMyPayments(req.user.userId);
  }

  @Post()
  create(
    @Request() req: any,
    @Body() body: { plan: string; amount: number; currency: string },
  ) {
    return this.paymentsService.createPayment(req.user.userId, body.plan, body.amount, body.currency);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.paymentsService.confirmPayment(id);
  }
}
