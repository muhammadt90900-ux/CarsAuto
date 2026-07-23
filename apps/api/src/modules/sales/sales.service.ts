// apps/api/src/modules/sales/sales.service.ts
//
// Dealer ERP — Phase 2 (Sales & Invoices). Recording a sale must never
// silently desync from Inventory, so stock is decremented by calling
// InventoryService.adjustStock() — the exact method the Inventory page's
// manual +/- buttons use — instead of writing a second, parallel version of
// the same "change quantity + write a movement row" logic here.

import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { SaleStatus, InvoiceStatus, InventoryMovementType } from '../../common/prisma/enums';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpsertCustomerDto } from './dto/upsert-customer.dto';
import { SalesQueryDto } from './dto/sales-query.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  private async requireDealer(userId: string) {
    const dealer = await this.prisma.dealer.findUnique({ where: { userId }, select: { id: true } });
    if (!dealer) {
      throw new ForbiddenException(
        'ئەم تایبەتمەندییە تەنها بۆ هەژماری فرۆشیارە / This feature is only available to dealer accounts',
      );
    }
    return dealer;
  }

  // ── Customers ──────────────────────────────────────────────────────────

  async createCustomer(userId: string, dto: UpsertCustomerDto) {
    const dealer = await this.requireDealer(userId);
    return this.prisma.customer.create({ data: { dealerId: dealer.id, ...dto } });
  }

  async findCustomers(userId: string, search?: string) {
    const dealer = await this.requireDealer(userId);
    return this.prisma.customer.findMany({
      where: {
        dealerId: dealer.id,
        ...(search
          ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { phone: { contains: search } }] }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── Sales ──────────────────────────────────────────────────────────────

  async createSale(userId: string, dto: CreateSaleDto) {
    const dealer = await this.requireDealer(userId);

    // Look up cost + current name for each inventory-linked line, and make
    // sure every referenced item actually belongs to this dealer before
    // touching any stock.
    const inventoryIds = dto.items.map(i => i.inventoryItemId).filter((id): id is string => !!id);
    const inventoryItems = inventoryIds.length
      ? await this.prisma.inventoryItem.findMany({ where: { id: { in: inventoryIds }, dealerId: dealer.id } })
      : [];
    const inventoryMap = new Map(inventoryItems.map(i => [i.id, i]));

    for (const line of dto.items) {
      if (line.inventoryItemId && !inventoryMap.has(line.inventoryItemId)) {
        throw new BadRequestException('کاڵایەک لە کڕینەکە هی تۆ نییە / One of the items is not in your inventory');
      }
      const item = line.inventoryItemId ? inventoryMap.get(line.inventoryItemId) : undefined;
      if (item && item.quantity - item.reservedQuantity < line.quantity) {
        throw new BadRequestException(
          `بڕی پێویست بۆ "${item.name}" بەردەست نییە (بڕی ئێستا: ${item.quantity}) / Insufficient stock for "${item.name}" (available: ${item.quantity})`,
        );
      }
    }

    const subtotal = dto.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const discount = dto.discount ?? 0;
    const tax = dto.tax ?? 0;
    const total = subtotal - discount + tax;

    const sale = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          dealerId: dealer.id,
          customerId: dto.customerId,
          contactRequestId: dto.contactRequestId,
          status: SaleStatus.COMPLETED,
          subtotal,
          discount,
          tax,
          total,
          currency: dto.currency ?? 'USD',
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
          createdByUserId: userId,
          items: {
            create: dto.items.map(line => {
              const item = line.inventoryItemId ? inventoryMap.get(line.inventoryItemId) : undefined;
              return {
                inventoryItemId: line.inventoryItemId,
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.quantity * line.unitPrice,
                unitCost: item?.costPrice ?? null,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Decrement stock for every tracked line inside this same
      // transaction — a sale and its stock movement commit or roll back
      // together, so inventory can never drift out of sync with sales
      // history even if one line fails partway through.
      for (const line of dto.items) {
        if (line.inventoryItemId) {
          await this.inventory.adjustStock(
            userId,
            line.inventoryItemId,
            { type: InventoryMovementType.SALE, change: -line.quantity, reason: `Sale #${created.id.slice(0, 8)}` },
            tx,
          );
        }
      }

      return created;
    });

    if (dto.issueInvoice) {
      return this.issueInvoice(userId, sale.id);
    }

    return sale;
  }

  async findSales(userId: string, query: SalesQueryDto) {
    const dealer = await this.requireDealer(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      dealerId: dealer.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            saleDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [data, total, revenueAgg] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: { items: true, customer: true, invoice: true },
        orderBy: { saleDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sale.count({ where }),
      this.prisma.sale.aggregate({ where: { ...where, status: SaleStatus.COMPLETED }, _sum: { total: true } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: { totalRevenue: revenueAgg._sum.total ?? 0 },
    };
  }

  async findOne(userId: string, id: string) {
    const dealer = await this.requireDealer(userId);
    const sale = await this.prisma.sale.findFirst({
      where: { id, dealerId: dealer.id },
      include: { items: true, customer: true, invoice: true },
    });
    if (!sale) throw new NotFoundException('کڕینەکە نەدۆزرایەوە / Sale not found');
    return sale;
  }

  async cancelSale(userId: string, id: string) {
    const dealer = await this.requireDealer(userId);
    const sale = await this.prisma.sale.findFirst({ where: { id, dealerId: dealer.id }, include: { items: true } });
    if (!sale) throw new NotFoundException('کڕینەکە نەدۆزرایەوە / Sale not found');
    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException('تەنها کڕینی تەواوبوو دەتوانرێت هەڵوەشێندرێتەوە / Only a completed sale can be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      // Restore stock for every line that came out of inventory, again via
      // the shared InventoryService so the movement log stays truthful —
      // and inside this same transaction so a partial cancellation can
      // never happen.
      for (const item of sale.items) {
        if (item.inventoryItemId) {
          await this.inventory.adjustStock(
            userId,
            item.inventoryItemId,
            { type: InventoryMovementType.RETURN, change: item.quantity, reason: `Sale #${sale.id.slice(0, 8)} cancelled` },
            tx,
          );
        }
      }
      return tx.sale.update({ where: { id }, data: { status: SaleStatus.CANCELLED } });
    });
  }

  // ── Invoices ───────────────────────────────────────────────────────────

  async issueInvoice(userId: string, saleId: string) {
    const dealer = await this.requireDealer(userId);
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, dealerId: dealer.id }, include: { invoice: true } });
    if (!sale) throw new NotFoundException('کڕینەکە نەدۆزرایەوە / Sale not found');
    if (sale.invoice) return sale.invoice;

    return this.prisma.$transaction(async (tx) => {
      const updatedDealer = await tx.dealer.update({
        where: { id: dealer.id },
        data: { nextInvoiceNumber: { increment: 1 } },
      });
      const year = new Date().getFullYear();
      const number = String(updatedDealer.nextInvoiceNumber - 1).padStart(6, '0');
      const invoiceNumber = `INV-${year}-${number}`;

      return tx.invoice.create({
        data: {
          saleId: sale.id,
          dealerId: dealer.id,
          invoiceNumber,
          status: InvoiceStatus.ISSUED,
          issuedAt: new Date(),
        },
      });
    });
  }

  async markInvoicePaid(userId: string, invoiceId: string) {
    const dealer = await this.requireDealer(userId);
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, dealerId: dealer.id } });
    if (!invoice) throw new NotFoundException('پسوولەکە نەدۆزرایەوە / Invoice not found');
    return this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: InvoiceStatus.PAID, paidAt: new Date() } });
  }

  async findInvoices(userId: string) {
    const dealer = await this.requireDealer(userId);
    return this.prisma.invoice.findMany({
      where: { dealerId: dealer.id },
      include: { sale: { include: { customer: true, items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
