import { Role } from '../common/types';
export declare class CreateUserDto {
    name: string;
    username: string;
    password: string;
    role: Role;
}
export declare class UpdateUserDto {
    name?: string;
    role?: Role;
    active?: boolean;
}
export declare class ChangePasswordDto {
    password: string;
}
