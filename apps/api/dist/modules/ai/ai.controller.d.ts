import { AiService } from './ai.service';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    suggestPrice(body: {
        make: string;
        model: string;
        year: number;
        mileage: number;
    }): Promise<number>;
}
