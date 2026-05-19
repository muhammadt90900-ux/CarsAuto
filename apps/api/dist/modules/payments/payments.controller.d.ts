import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    getAll(req: any): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        userId: string;
        currency: string;
        plan: string;
        amount: number;
    }[]>;
    create(req: any, body: {
        plan: string;
        amount: number;
        currency: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        userId: string;
        currency: string;
        plan: string;
        amount: number;
    }>;
    confirm(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        userId: string;
        currency: string;
        plan: string;
        amount: number;
    }>;
}
