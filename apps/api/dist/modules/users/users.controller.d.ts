import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findById(id: string): Promise<any>;
    updateProfile(req: any, data: {
        name?: string;
        phone?: string;
        locale?: string;
        avatar?: string;
    }): Promise<any>;
}
