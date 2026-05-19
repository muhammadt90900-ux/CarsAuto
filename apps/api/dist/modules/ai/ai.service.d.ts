export declare class AiService {
    suggestPrice(make: string, model: string, year: number, mileage: number): Promise<number>;
    detectSpam(text: string): Promise<boolean>;
}
