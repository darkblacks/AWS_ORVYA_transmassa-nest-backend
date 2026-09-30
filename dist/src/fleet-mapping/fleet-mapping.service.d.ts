import { BranchesService } from '../branches/branches.service';
import { AuthUser } from '../common/types';
import { DatabaseService } from '../database/database.service';
interface MemberRow {
    id: string;
    group_id: string;
    plate: string;
    branch_code: string | null;
    driver_name: string | null;
    vehicle_type: string | null;
    owner_code: string | null;
    service_override: string | null;
    notes: string | null;
    updated_at: Date;
}
export declare class FleetMappingService {
    private readonly db;
    private readonly branches;
    constructor(db: DatabaseService, branches: BranchesService);
    cleanPlate(value: string): string;
    groups(): Promise<{
        groups: {
            id: number;
            name: string;
            slug: string;
            is_shared: boolean;
            is_system: boolean;
            member_count: number;
            bases: never[];
        }[];
    }>;
    baseCodes(): Promise<{
        items: {
            code: string;
            label: string;
            active: boolean;
        }[];
    }>;
    members(groupId: number): Promise<{
        group: {
            id: number;
            name: string;
            slug: string;
            is_system: boolean;
            is_shared: boolean;
        };
        members: {
            id: number;
            group_id: number;
            plate: string;
            base_code: string | null;
            driver_name: string | null;
            vehicle_type: string | null;
            owner_code: string | null;
            service_override: string | null;
            notes: string | null;
            updated_at: Date;
        }[];
    }>;
    upsertMember(actor: AuthUser, groupId: number, plateParam: string, input: Partial<MemberRow>): Promise<{
        id: number;
        group_id: number;
        plate: string;
        base_code: string | null;
        driver_name: string | null;
        vehicle_type: string | null;
        owner_code: string | null;
        service_override: string | null;
        notes: string | null;
        updated_at: Date;
    }>;
    deleteMember(actor: AuthUser, groupId: number, plateParam: string): Promise<{
        ok: boolean;
    }>;
    auditLogs(query: {
        group_id?: string;
        plate?: string;
        limit?: string;
    }): Promise<{
        items: {
            id: number;
            action: string;
            group_id: number | null;
            plate: string | null;
            base_code: string | null;
            actor_user_id: number | null;
            actor_email: string | null;
            actor_role: string | null;
            before_data: Record<string, unknown> | null;
            after_data: Record<string, unknown> | null;
            created_at: Date;
        }[];
    }>;
    private requireGroup;
    private findMember;
    private memberDto;
    private audit;
}
export {};
