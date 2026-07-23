// apps/api/src/modules/accounting/accounting.service.ts
//
// Dealer ERP — Phase 3 (Accounting). Revenue and cost-of-goods-sold are
// derived from Sale/SaleItem on every request, never duplicated into a
// second ledger — see file-level note in schema.prisma. Expense is the one
// genuinely new table this phase introduces.

import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SaleStatus } from '../../common/prisma/enums';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ReportQueryDto, ReportPeriod } from './dto/report-query.dto';

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireDealer(userId: string) {
    const dealer = await this.prisma.dealer.findUnique({ where: { userId }, select: { id: true } });
    if (!dealer) {
      throw new ForbiddenException(
        'ئەم تایبەتمەندییە تەنها بۆ هەژماری فرۆشیارە / This feature is only available to dealer accounts',
      );
    }
    return dealer;
  }

  /** Resolves the effective [from, to] range: explicit query params win, otherwise a sensible window for the period. */
  private resolveRange(query: ReportQueryDto): { from: Date; to: Date } {
    if (query.from || query.to) {
      return {
        from: query.from ? new Date(query.from) : new Date(0),
        to: query.to ? new Date(query.to) : new Date(),
      };
    }
    const now = new Date();
    const period: ReportPeriod = query.period ?? 'monthly';
    switch (period) {
      case 'daily': {
        const from = new Date(now); from.setHours(0, 0, 0, 0);
        return { from, to: now };
      }
      case 'weekly': {
        const from = new Date(now);
        from.setDate(now.getDate() - now.getDay());
        from.setHours(0, 0, 0, 0);
        return { from, to: now };
      }
      case 'yearly': {
        return { from: new Date(now.getFullYear(), 0, 1), to: now };
      }
      case 'monthly':
      default:
        return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    }
  }

  /** Buckets a date into a label matching the report's granularity, for a simple time series. */
  private bucketLabel(date: Date, period: ReportPeriod): string {
    if (period === 'daily' || period === 'weekly') {
      return date.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    if (period === 'yearly') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    }
    return date.toISOString().slice(0, 10); // monthly range → daily buckets within the month
  }

  // ── Expenses ─────────────────────────────────────────────────────────

  async createExpense(userId: string, dto: CreateExpenseDto) {
    const dealer = await this.requireDealer(userId);
    return this.prisma.expense.create({
      data: {
        dealerId: dealer.id,
        category: dto.category,
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        description: dto.description,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
        createdByUserId: userId,
      },
    });
  }

  async findExpenses(userId: string, query: ReportQueryDto) {
    const dealer = await this.requireDealer(userId);
    const { from, to } = this.resolveRange(query);
    return this.prisma.expense.findMany({
      where: {
        dealerId: dealer.id,
        expenseDate: { gte: from, lte: to },
        ...(query.category ? { category: query.category } : {}),
      },
      orderBy: { expenseDate: 'desc' },
    });
  }

  async deleteExpense(userId: string, id: string) {
    const dealer = await this.requireDealer(userId);
    const existing = await this.prisma.expense.findFirst({ where: { id, dealerId: dealer.id } });
    if (!existing) throw new NotFoundException('خەرجییەکە نەدۆزرایەوە / Expense not found');
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }

  // ── Profit & Loss report ────────────────────────────────────────────

  async getProfitLoss(userId: string, query: ReportQueryDto) {
    const dealer = await this.requireDealer(userId);
    const { from, to } = this.resolveRange(query);
    const period: ReportPeriod = query.period ?? 'monthly';

    const [sales, expenses] = await Promise.all([
      this.prisma.sale.findMany({
        where: { dealerId: dealer.id, status: SaleStatus.COMPLETED, saleDate: { gte: from, lte: to } },
        include: { items: true },
      }),
      this.prisma.expense.findMany({
        where: { dealerId: dealer.id, expenseDate: { gte: from, lte: to } },
      }),
    ]);

    let revenue = 0;
    let cogs = 0;
    const revenueByBucket = new Map<string, number>();
    const cogsByBucket = new Map<string, number>();

    for (const sale of sales) {
      const saleTotal = Number(sale.total);
      revenue += saleTotal;
      const bucket = this.bucketLabel(sale.saleDate, period);
      revenueByBucket.set(bucket, (revenueByBucket.get(bucket) ?? 0) + saleTotal);

      for (const item of sale.items) {
        const cost = Number(item.unitCost ?? 0) * item.quantity;
        cogs += cost;
        cogsByBucket.set(bucket, (cogsByBucket.get(bucket) ?? 0) + cost);
      }
    }

    let totalExpenses = 0;
    const expensesByBucket = new Map<string, number>();
    const expensesByCategory = new Map<string, number>();
    for (const exp of expenses) {
      const amount = Number(exp.amount);
      totalExpenses += amount;
      const bucket = this.bucketLabel(exp.expenseDate, period);
      expensesByBucket.set(bucket, (expensesByBucket.get(bucket) ?? 0) + amount);
      expensesByCategory.set(exp.category, (expensesByCategory.get(exp.category) ?? 0) + amount);
    }

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    // Merge every bucket that appears in either series into one sorted time series.
    const allBuckets = Array.from(new Set([...revenueByBucket.keys(), ...expensesByBucket.keys()])).sort();
    const series = allBuckets.map(bucket => ({
      bucket,
      revenue: revenueByBucket.get(bucket) ?? 0,
      cogs: cogsByBucket.get(bucket) ?? 0,
      expenses: expensesByBucket.get(bucket) ?? 0,
      netProfit: (revenueByBucket.get(bucket) ?? 0) - (cogsByBucket.get(bucket) ?? 0) - (expensesByBucket.get(bucket) ?? 0),
    }));

    return {
      range: { from, to, period },
      revenue,
      cogs,
      grossProfit,
      totalExpenses,
      netProfit,
      salesCount: sales.length,
      expensesByCategory: Object.fromEntries(expensesByCategory),
      series,
    };
  }
}
