import { AuthUser } from '../common/types';
import { UpsertMemberDto } from './fleet-mapping.dto';
import { FleetMappingService } from './fleet-mapping.service';
export declare class FleetMappingController {
    private readonly mapping;
    constructor(mapping: FleetMappingService);
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
    members(id: number): Promise<{
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
    upsertMember(user: AuthUser, id: number, plate: string, dto: UpsertMemberDto): Promise<{
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
    deleteMember(user: AuthUser, id: number, plate: string): Promise<{
        ok: boolean;
    }>;
    audit(query: {
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
}
