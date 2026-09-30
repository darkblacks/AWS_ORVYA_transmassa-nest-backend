import { AuthUser, Role } from '../common/types';
import { DatabaseService } from '../database/database.service';
export declare class UsersService {
    private readonly db;
    constructor(db: DatabaseService);
    private normalizeUsername;
    private publicUser;
    list(): Promise<{
        id: number;
        name: string;
        username: string;
        email: string;
        role: Role;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(actor: AuthUser, input: {
        name: string;
        username: string;
        password: string;
        role: Role;
    }): Promise<{
        id: number;
        name: string;
        username: string;
        email: string;
        role: Role;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(actor: AuthUser, id: number, input: {
        name?: string;
        role?: Role;
        active?: boolean;
    }): Promise<{
        id: number;
        name: string;
        username: string;
        email: string;
        role: Role;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    changePassword(actor: AuthUser, id: number, password: string): Promise<{
        ok: boolean;
    }>;
    private getRow;
    private audit;
}
