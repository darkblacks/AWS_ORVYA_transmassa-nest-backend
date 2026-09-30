import { AuthUser } from '../common/types';
import { ChangePasswordDto, CreateUserDto, UpdateUserDto } from './users.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    list(): Promise<{
        id: number;
        name: string;
        username: string;
        email: string;
        role: import("../common/types").Role;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(actor: AuthUser, dto: CreateUserDto): Promise<{
        id: number;
        name: string;
        username: string;
        email: string;
        role: import("../common/types").Role;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(actor: AuthUser, id: number, dto: UpdateUserDto): Promise<{
        id: number;
        name: string;
        username: string;
        email: string;
        role: import("../common/types").Role;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    changePassword(actor: AuthUser, id: number, dto: ChangePasswordDto): Promise<{
        ok: boolean;
    }>;
}
