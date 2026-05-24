import { PrismaService } from '../../common/prisma/prisma.service';
export declare class PaymentsService {
    private prisma;
    constructor(prisma: PrismaService);
    getMyPayments(userId: string): Promise<any>;
    createPayment(userId: string, plan: string, amount: number, currency: string): Promise<any>;
    confirmPayment(id: string): Promise<any>;
}
