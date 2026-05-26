import { PrismaService } from '../../common/prisma/prisma.service';
export declare class PaymentsService {
    private prisma;
    constructor(prisma: PrismaService);
    getMyPayments(userId: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        userId: string;
        currency: string;
        plan: string;
        amount: number;
    }[]>;
    createPayment(userId: string, plan: string, amount: number, currency: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        userId: string;
        currency: string;
        plan: string;
        amount: number;
    }>;
    confirmPayment(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        userId: string;
        currency: string;
        plan: string;
        amount: number;
    }>;
}
