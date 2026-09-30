import { AuthUser } from '../common/types';
import { AuthService } from './auth.service';
import { LoginDto } from './auth.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    login(dto: LoginDto): Promise<{
        token: string;
        user: {
            id: number;
            name: string;
            username: string;
            email: string;
            role: import("../common/types").Role;
        };
    }>;
    me(user: AuthUser): Promise<{
        user: {
            id: number;
            name: string;
            username: string;
            email: string;
            role: import("../common/types").Role;
        };
    }>;
}
