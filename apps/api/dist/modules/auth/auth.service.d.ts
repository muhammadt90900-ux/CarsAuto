import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly cfg;
    private readonly logger;
    constructor(prisma: PrismaService, jwt: JwtService, cfg: ConfigService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            name: string;
            email: string;
            phone: string;
            role: string;
            verified: boolean;
        };
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            name: string;
            email: string;
            phone: string;
            role: string;
            verified: boolean;
        };
    }>;
    refreshTokens(rawToken: string | undefined): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            name: string;
            email: string;
            phone: string;
            role: string;
            verified: boolean;
        };
    }>;
    revokeRefreshToken(rawToken: string): Promise<void>;
    private issueTokenPair;
    private recordFailedLogin;
    private pruneOldRefreshTokens;
    private hashToken;
    /** Parse duration string like '7d', '15m', '1h' to milliseconds */
    private parseDuration;
}
