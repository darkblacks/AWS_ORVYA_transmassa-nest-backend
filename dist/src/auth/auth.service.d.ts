import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { AuthUser, Role } from '../common/types';
export declare class AuthService {
    private readonly db;
    private readonly jwt;
    constructor(db: DatabaseService, jwt: JwtService);
    normalizeLogin(value: string): {
        username: string;
        email: string;
    };
    login(usernameOrEmail: string, password: string): Promise<{
        token: string;
        user: {
            id: number;
            name: string;
            username: string;
            email: string;
            role: Role;
        };
    }>;
    me(user: AuthUser): Promise<{
        user: {
            id: number;
            name: string;
            username: string;
            email: string;
            role: Role;
        };
    }>;
}
