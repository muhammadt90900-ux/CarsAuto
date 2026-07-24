// apps/api/src/modules/admin/admin-erp.service.ts
//
// Dealer ERP — Phase 5 (Admin analytics). Read-only aggregation across all
// dealers — the counterpart to InventoryService/SalesService/AccountingService,
// which are all scoped to a single calling dealer. Every number here is
// computed from the same Inventory/Sale/Invoice/Expense tables those
// services write to — no separate admin-only ledger.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SaleStatus, InventoryItemStatus } from '../../common/prisma/enums';

@Injectable()
export class AdminErpService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      dealersWithInventory,
      dealersWithSales,
      totalInventoryItems,
      lowStockItemsCount,
      totalSales,
      revenueAgg,
      totalInvoices,
      unpaidInvoices,
      pastDueSubscriptions,
    ] = await Promise.all([
      this.prisma.inventoryItem.findMany({ distinct: ['dealerId'], select: { dealerId: true } }),
      this.prisma.sale.findMany({ distinct: ['dealerId'], select: { dealerId: true } }),
      this.prisma.inventoryItem.count(),
      this.prisma.inventoryItem.count({
        where: { status: { in: [InventoryItemStatus.LOW_STOCK, InventoryItemStatus.OUT_OF_STOCK] } },
      }),
      this.prisma.sale.count({ where: { status: SaleStatus.COMPLETED } }),
      this.prisma.sale.aggregate({ where: { status: SaleStatus.COMPLETED }, _sum: { total: true } }),
      this.prisma.invoice.count(),
      this.prisma.invoice.count({ where: { status: { in: ['ISSUED', 'DRAFT'] } } }),
      this.prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
    ]);

    return {
      adoption: {
        dealersUsingInventory: dealersWithInventory.length,
        dealersUsingSales: dealersWithSales.length,
      },
      inventory: {
        totalItems: totalInventoryItems,
        lowOrOutOfStock: lowStockItemsCount,
      },
      sales: {
        totalCompleted: totalSales,
        totalRevenue: revenueAgg._sum.total ?? 0,
      },
      invoices: {
        total: totalInvoices,
        unpaid: unpaidInvoices,
      },
      // Coarse system-health proxies — real infra health (queue lag, DB
      // latency) belongs in the existing Grafana/Prometheus stack, not
      // reinvented here. This is specifically ERP-domain health: dealers
      // at risk of losing access due to a failed payment.
      systemHealth: {
        dealersWithPastDuePayment: pastDueSubscriptions,
      },
    };
  }

  /** Per-dealer ERP usage breakdown, for the admin dealer-activity table. */
  async getDealerActivity(page = 1, limit = 20) {
    const dealers = await this.prisma.dealer.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nameEn: true,
        _count: { select: { inventoryItems: true, sales: true, invoices: true } },
      },
    });

    const total = await this.prisma.dealer.count();

    // Revenue per dealer isn't available via _count, so fetch it separately
    // for just this page of dealers.
    const dealerIds = dealers.map(d => d.id);
    const revenueByDealer = dealerIds.length
      ? await this.prisma.sale.groupBy({
          by: ['dealerId'],
          where: { dealerId: { in: dealerIds }, status: SaleStatus.COMPLETED },
          _sum: { total: true },
        })
      : [];
    const revenueMap = new Map(revenueByDealer.map(r => [r.dealerId, r._sum.total ?? 0]));

    return {
      data: dealers.map(d => ({
        dealerId: d.id,
        name: d.nameEn,
        inventoryItemCount: d._count.inventoryItems,
        salesCount: d._count.sales,
        invoiceCount: d._count.invoices,
        totalRevenue: revenueMap.get(d.id) ?? 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
