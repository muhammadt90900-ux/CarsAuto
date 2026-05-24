export declare class EmailService {
    private transporter;
    sendOtp(email: string, code: string): Promise<void>;
}
