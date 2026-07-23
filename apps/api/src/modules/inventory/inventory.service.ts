// apps/api/src/modules/inventory/inventory.service.ts
//
// Dealer ERP — Phase 1 (Inventory Management).
//
// Every method takes `userId` (from the JWT) and resolves it to the
// caller's own Dealer row — never a raw dealerId from the client — so a
// dealer can only ever see or modify their own stock. Same pattern as
// DealersController.leads() (dealers.controller.ts).

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InventoryItemStatus, InventoryMovementType } from '../../common/prisma/enums';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves the caller's Dealer row from their JWT userId, or throws. Pass `tx` to run inside an existing transaction. */
  private async requireDealer(userId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const dealer = await db.dealer.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!dealer) {
      throw new ForbiddenException(
        'ئەم تایبەتمەندییە تەنها بۆ هەژماری فرۆشیارە / This feature is only available to dealer accounts',
      );
    }
    return dealer;
  }

  /** Derives status from quantity vs. reorderThreshold — kept server-side, never trusted from client input. */
  private deriveStatus(quantity: number, reorderThreshold: number, currentStatus?: InventoryItemStatus): InventoryItemStatus {
    if (currentStatus === InventoryItemStatus.DISCONTINUED) return InventoryItemStatus.DISCONTINUED;
    if (quantity <= 0) return InventoryItemStatus.OUT_OF_STOCK;
    if (quantity <= reorderThreshold) return InventoryItemStatus.LOW_STOCK;
    return InventoryItemStatus.IN_STOCK;
  }

  async create(userId: string, dto: CreateInventoryItemDto) {
    const dealer = await this.requireDealer(userId);

    if (dto.listingId) {
      const listing = await this.prisma.listing.findFirst({
        where: { id: dto.listingId, userId },
        select: { id: true },
      });
      if (!listing) {
        throw new BadRequestException('ئیعلانەکە نەدۆزرایەوە یان هی تۆ نییە / Listing not found or not owned by you');
      }
    }

    const reorderThreshold = dto.reorderThreshold ?? 1;
    const status = this.deriveStatus(dto.quantity, reorderThreshold);

    return this.prisma.inventoryItem.create({
      data: {
        dealerId: dealer.id,
        listingId: dto.listingId,
        type: dto.type,
        name: dto.name,
        sku: dto.sku,
        quantity: dto.quantity,
        reorderThreshold,
        costPrice: dto.costPrice,
        currency: dto.currency ?? 'USD',
        notes: dto.notes,
        status,
        // Opening balance is itself a movement, so the audit trail always
        // explains 100% of an item's current quantity, including day one.
        movements: {
          create: {
            type: InventoryMovementType.RESTOCK,
            change: dto.quantity,
            reason: 'Initial stock',
            performedByUserId: userId,
          },
        },
      },
    });
  }

  async findAll(userId: string, query: InventoryQueryDto) {
    const dealer = await this.requireDealer(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      dealerId: dealer.id,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { sku: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total, lowStockCount, totalValueAgg] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventoryItem.count({ where }),
      this.prisma.inventoryItem.count({
        where: { dealerId: dealer.id, status: { in: [InventoryItemStatus.LOW_STOCK, InventoryItemStatus.OUT_OF_STOCK] } },
      }),
      this.prisma.inventoryItem.aggregate({
        where: { dealerId: dealer.id, status: { not: InventoryItemStatus.DISCONTINUED } },
        _sum: { quantity: true },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        lowStockCount,
        totalUnits: totalValueAgg._sum.quantity ?? 0,
      },
    };
  }

  async findOne(userId: string, id: string) {
    const dealer = await this.requireDealer(userId);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, dealerId: dealer.id },
      include: { movements: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!item) throw new NotFoundException('کاڵاکە نەدۆزرایەوە / Item not found');
    return item;
  }

  async update(userId: string, id: string, dto: UpdateInventoryItemDto) {
    const dealer = await this.requireDealer(userId);
    const existing = await this.prisma.inventoryItem.findFirst({ where: { id, dealerId: dealer.id } });
    if (!existing) throw new NotFoundException('کاڵاکە نەدۆزرایەوە / Item not found');

    const reorderThreshold = dto.reorderThreshold ?? existing.reorderThreshold;
    const status =
      dto.status ?? this.deriveStatus(existing.quantity, reorderThreshold, existing.status);

    return this.prisma.inventoryItem.update({
      where: { id },
      data: { ...dto, reorderThreshold, status },
    });
  }

  /**
   * Applies a signed quantity change and writes an audit-trail movement.
   * Pass `tx` (e.g. from SalesService.createSale) to run as part of a
   * larger transaction — the sale record and its stock decrement must
   * commit or roll back together, never one without the other.
   */
  async adjustStock(userId: string, id: string, dto: AdjustStockDto, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const dealer = await this.requireDealer(userId, tx);
    const existing = await db.inventoryItem.findFirst({ where: { id, dealerId: dealer.id } });
    if (!existing) throw new NotFoundException('کاڵاکە نەدۆزرایەوە / Item not found');

    const newQuantity = existing.quantity + dto.change;
    if (newQuantity < 0) {
      throw new BadRequestException(
        `بڕی پێویست بەردەست نییە (بڕی ئێستا: ${existing.quantity}) / Insufficient stock (current: ${existing.quantity})`,
      );
    }

    const status = this.deriveStatus(newQuantity, existing.reorderThreshold, existing.status);

    const applyChange = async (client: Prisma.TransactionClient | PrismaService) => {
      const updated = await client.inventoryItem.update({
        where: { id },
        data: { quantity: newQuantity, status },
      });
      await client.inventoryMovement.create({
        data: {
          inventoryItemId: id,
          type: dto.type,
          change: dto.change,
          reason: dto.reason,
          performedByUserId: userId,
        },
      });
      return updated;
    };

    // Already inside a caller-provided transaction — just run against it,
    // don't open a nested one.
    if (tx) return applyChange(tx);
    return this.prisma.$transaction((innerTx) => applyChange(innerTx));
  }

  async remove(userId: string, id: string) {
    const dealer = await this.requireDealer(userId);
    const existing = await this.prisma.inventoryItem.findFirst({ where: { id, dealerId: dealer.id } });
    if (!existing) throw new NotFoundException('کاڵاکە نەدۆزرایەوە / Item not found');
    await this.prisma.inventoryItem.delete({ where: { id } });
    return { success: true };
  }

  /** Powers the dashboard "low stock" widget/notification job. */
  async lowStockAlerts(userId: string) {
    const dealer = await this.requireDealer(userId);
    return this.prisma.inventoryItem.findMany({
      where: {
        dealerId: dealer.id,
        status: { in: [InventoryItemStatus.LOW_STOCK, InventoryItemStatus.OUT_OF_STOCK] },
      },
      orderBy: { quantity: 'asc' },
    });
  }
}
