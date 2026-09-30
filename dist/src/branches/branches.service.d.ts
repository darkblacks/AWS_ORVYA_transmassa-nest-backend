import { AuthUser } from '../common/types';
import { DatabaseService } from '../database/database.service';
export declare class BranchesService {
    private readonly db;
    constructor(db: DatabaseService);
    private dto;
    list(): Promise<{
        code: string;
        name: string;
        displayName: string;
        aliases: string[];
        immutable: boolean;
        active: boolean;
    }[]>;
    adminUpsert(actor: AuthUser, input: {
        code: string;
        name: string;
        displayName?: string;
        aliases?: string[];
        active?: boolean;
    }): Promise<{
        code: string;
        name: string;
        displayName: string;
        aliases: string[];
        immutable: boolean;
        active: boolean;
    }>;
    private find;
    requireBranch(code: string): Promise<void>;
    private audit;
}
