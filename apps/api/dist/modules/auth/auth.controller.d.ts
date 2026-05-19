import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    getMe(req: any): Promise<{
        email: string;
        name: string;
        phone: string;
        locale: string;
        id: string;
        avatar: string;
        role: import(".prisma/client").$Enums.UserRole;
        verified: boolean;
        createdAt: Date;
    }>;
}
