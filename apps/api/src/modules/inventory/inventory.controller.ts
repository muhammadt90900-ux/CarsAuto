// apps/api/src/modules/inventory/inventory.controller.ts
//
// Dealer ERP — Phase 1 (Inventory Management). All routes require a logged
// in dealer; the dealer is resolved server-side from the JWT (never trusted
// from the request body/params) — see InventoryService.requireDealer.

import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';

@ApiTags('Inventory')
@ApiBearerAuth('bearer')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  findAll(@Request() req: any, @Query() query: InventoryQueryDto) {
    return this.inventory.findAll(req.user.userId, query);
  }

  @Get('low-stock')
  lowStockAlerts(@Request() req: any) {
    return this.inventory.lowStockAlerts(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.inventory.findOne(req.user.userId, id);
  }

  @Post()
  @UseGuards(EmailVerifiedGuard)
  create(@Request() req: any, @Body() dto: CreateInventoryItemDto) {
    return this.inventory.create(req.user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(EmailVerifiedGuard)
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.inventory.update(req.user.userId, id, dto);
  }

  @Post(':id/adjust')
  @UseGuards(EmailVerifiedGuard)
  adjustStock(@Request() req: any, @Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.inventory.adjustStock(req.user.userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(EmailVerifiedGuard)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.inventory.remove(req.user.userId, id);
  }
}
