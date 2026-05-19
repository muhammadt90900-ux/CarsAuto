import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    getMe(userId: string): Promise<{
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
    private signTokens;
}
