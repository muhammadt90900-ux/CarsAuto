import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, res: Response): Promise<{
        access_token: string;
        user: {
            id: string;
            name: string;
            email: string;
            phone: string;
            role: string;
            verified: boolean;
        };
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        access_token: string;
        user: {
            id: string;
            name: string;
            email: string;
            phone: string;
            role: string;
            verified: boolean;
        };
    }>;
    refresh(req: Request, res: Response): Promise<{
        access_token: string;
    }>;
    logout(req: Request, res: Response): Promise<void>;
    me(req: Request): any;
    private cookieOptions;
    private setRefreshCookie;
}
