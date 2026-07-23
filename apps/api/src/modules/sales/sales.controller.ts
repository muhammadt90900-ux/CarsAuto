// apps/api/src/modules/sales/sales.controller.ts

import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpsertCustomerDto } from './dto/upsert-customer.dto';
import { SalesQueryDto } from './dto/sales-query.dto';

@ApiTags('Sales')
@ApiBearerAuth('bearer')
@Controller()
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  // ── Customers ────────────────────────────────────────────────────────
  @Get('customers')
  findCustomers(@Request() req: any, @Query('search') search?: string) {
    return this.sales.findCustomers(req.user.userId, search);
  }

  @Post('customers')
  @UseGuards(EmailVerifiedGuard)
  createCustomer(@Request() req: any, @Body() dto: UpsertCustomerDto) {
    return this.sales.createCustomer(req.user.userId, dto);
  }

  // ── Sales ────────────────────────────────────────────────────────────
  @Get('sales')
  findAll(@Request() req: any, @Query() query: SalesQueryDto) {
    return this.sales.findSales(req.user.userId, query);
  }

  @Get('sales/:id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.sales.findOne(req.user.userId, id);
  }

  @Post('sales')
  @UseGuards(EmailVerifiedGuard)
  create(@Request() req: any, @Body() dto: CreateSaleDto) {
    return this.sales.createSale(req.user.userId, dto);
  }

  @Patch('sales/:id/cancel')
  @UseGuards(EmailVerifiedGuard)
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.sales.cancelSale(req.user.userId, id);
  }

  // ── Invoices ─────────────────────────────────────────────────────────
  @Get('invoices')
  findInvoices(@Request() req: any) {
    return this.sales.findInvoices(req.user.userId);
  }

  @Post('sales/:id/invoice')
  @UseGuards(EmailVerifiedGuard)
  issueInvoice(@Request() req: any, @Param('id') id: string) {
    return this.sales.issueInvoice(req.user.userId, id);
  }

  @Patch('invoices/:id/paid')
  @UseGuards(EmailVerifiedGuard)
  markPaid(@Request() req: any, @Param('id') id: string) {
    return this.sales.markInvoicePaid(req.user.userId, id);
  }
}
