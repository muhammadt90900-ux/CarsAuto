import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    getAll(req: any): Promise<any>;
    create(req: any, body: {
        plan: string;
        amount: number;
        currency: string;
    }): Promise<any>;
    confirm(id: string): Promise<any>;
}
