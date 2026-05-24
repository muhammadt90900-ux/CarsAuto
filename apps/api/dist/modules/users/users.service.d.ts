import { PrismaService } from '../../common/prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<any>;
    updateProfile(id: string, data: {
        name?: string;
        phone?: string;
        locale?: string;
        avatar?: string;
    }): Promise<any>;
}
