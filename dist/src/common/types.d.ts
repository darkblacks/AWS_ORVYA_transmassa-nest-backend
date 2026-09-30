export type Role = 'ADMIN' | 'PANEL';
export type BranchCode = 'RJ' | 'RB' | 'SP';
export type OperationalStatus = 'AVAILABLE' | 'COMMITTED' | 'IN_TRANSIT' | 'MAINTENANCE';
export type Ownership = 'OWN' | 'THIRD_PARTY';
export interface AuthUser {
    sub: number;
    email: string;
    role: Role;
}
