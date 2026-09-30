import { AuthUser } from '../common/types';
import { UpsertBranchDto } from './branches.dto';
import { BranchesService } from './branches.service';
export declare class BranchesController {
    private readonly branches;
    constructor(branches: BranchesService);
    list(): Promise<{
        code: string;
        name: string;
        displayName: string;
        aliases: string[];
        immutable: boolean;
        active: boolean;
    }[]>;
    adminUpsert(actor: AuthUser, dto: UpsertBranchDto): Promise<{
        code: string;
        name: string;
        displayName: string;
        aliases: string[];
        immutable: boolean;
        active: boolean;
    }>;
}
