import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async getMyPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPayment(userId: string, plan: string, amount: number, currency: string) {
    return this.prisma.payment.create({
      data: { userId, plan, amount, currency, status: 'pending' },
    });
  }

  async confirmPayment(id: string) {
    return this.prisma.payment.update({
      where: { id },
      data: { status: 'completed' },
    });
  }
}
