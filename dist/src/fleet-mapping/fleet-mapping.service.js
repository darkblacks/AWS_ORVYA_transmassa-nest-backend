"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FleetMappingService = void 0;
const common_1 = require("@nestjs/common");
const branches_service_1 = require("../branches/branches.service");
const database_service_1 = require("../database/database.service");
let FleetMappingService = class FleetMappingService {
    db;
    branches;
    constructor(db, branches) {
        this.db = db;
        this.branches = branches;
    }
    cleanPlate(value) {
        return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    async groups() {
        const result = await this.db.panel(`SELECT g.id, g.name, g.slug, g.is_system, COUNT(m.id)::text AS total_members
       FROM panel_fleet_groups g
       LEFT JOIN panel_fleet_group_members m ON m.group_id = g.id
       GROUP BY g.id
       ORDER BY g.is_system DESC, g.name`);
        const groups = result.rows.map(row => ({
            id: Number(row.id),
            name: row.name,
            slug: row.slug,
            is_shared: true,
            is_system: row.is_system,
            member_count: Number(row.total_members),
            bases: []
        }));
        return { groups };
    }
    async baseCodes() {
        const result = await this.db.panel(`SELECT code, display_name FROM panel_branches WHERE active = TRUE ORDER BY code`);
        return { items: result.rows.map(row => ({ code: row.code, label: row.display_name, active: true })) };
    }
    async members(groupId) {
        await this.requireGroup(groupId);
        const groupResult = await this.db.panel(`SELECT id, name, slug, is_system FROM panel_fleet_groups WHERE id = $1`, [groupId]);
        const result = await this.db.panel(`SELECT id, group_id, plate, branch_code, driver_name, vehicle_type, owner_code, service_override, notes, updated_at
       FROM panel_fleet_group_members
       WHERE group_id = $1
      ORDER BY branch_code NULLS LAST, plate`, [groupId]);
        const group = groupResult.rows[0];
        return {
            group: {
                id: Number(group.id),
                name: group.name,
                slug: group.slug,
                is_system: group.is_system,
                is_shared: true
            },
            members: result.rows.map(row => this.memberDto(row))
        };
    }
    async upsertMember(actor, groupId, plateParam, input) {
        await this.requireGroup(groupId);
        const plate = this.cleanPlate(plateParam);
        const branch = input.branch_code?.trim().toUpperCase() || null;
        if (branch)
            await this.branches.requireBranch(branch);
        const before = await this.findMember(groupId, plate);
        const result = await this.db.panel(`INSERT INTO panel_fleet_group_members(
         group_id, plate, branch_code, driver_name, vehicle_type, owner_code, service_override, notes, created_by, updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       ON CONFLICT (group_id, plate) DO UPDATE SET
         branch_code = EXCLUDED.branch_code,
         driver_name = EXCLUDED.driver_name,
         vehicle_type = EXCLUDED.vehicle_type,
         owner_code = EXCLUDED.owner_code,
         service_override = EXCLUDED.service_override,
         notes = EXCLUDED.notes,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING id, group_id, plate, branch_code, driver_name, vehicle_type, owner_code, service_override, notes, updated_at`, [
            groupId,
            plate,
            branch,
            input.driver_name || null,
            input.vehicle_type || null,
            input.owner_code || null,
            input.service_override || null,
            input.notes || null,
            actor.sub
        ]);
        const after = this.memberDto(result.rows[0]);
        await this.audit(actor, before ? 'MAPPING_UPDATE' : 'MAPPING_CREATE', `${groupId}:${plate}`, before, after);
        return after;
    }
    async deleteMember(actor, groupId, plateParam) {
        const plate = this.cleanPlate(plateParam);
        const before = await this.findMember(groupId, plate);
        if (!before)
            throw new common_1.NotFoundException('Placa não encontrada no mapeamento');
        await this.db.panel(`DELETE FROM panel_fleet_group_members WHERE group_id = $1 AND plate = $2`, [groupId, plate]);
        await this.audit(actor, 'MAPPING_DELETE', `${groupId}:${plate}`, before, null);
        return { ok: true };
    }
    async auditLogs(query) {
        const limit = Math.max(1, Math.min(Number(query.limit || 100), 500));
        const filters = [`entity = 'panel_fleet_group_members'`];
        const params = [];
        if (query.group_id) {
            params.push(`${query.group_id}:%`);
            filters.push(`entity_id LIKE $${params.length}`);
        }
        if (query.plate) {
            params.push(`%:${this.cleanPlate(query.plate)}`);
            filters.push(`entity_id LIKE $${params.length}`);
        }
        params.push(limit);
        const result = await this.db.panel(`SELECT id, action, entity_id, actor_user_id, actor_email, actor_role, before_data, after_data, created_at
       FROM panel_audit_logs
       WHERE ${filters.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length}`, params);
        return {
            items: result.rows.map(row => {
                const [groupId, plate] = String(row.entity_id || '').split(':');
                const after = row.after_data || {};
                const before = row.before_data || {};
                return {
                    id: Number(row.id),
                    action: row.action,
                    group_id: Number(groupId) || null,
                    plate: plate || null,
                    base_code: String(after.base_code || before.base_code || after.branch_code || before.branch_code || '') || null,
                    actor_user_id: row.actor_user_id ? Number(row.actor_user_id) : null,
                    actor_email: row.actor_email,
                    actor_role: row.actor_role,
                    before_data: row.before_data,
                    after_data: row.after_data,
                    created_at: row.created_at
                };
            })
        };
    }
    async requireGroup(groupId) {
        const result = await this.db.panel(`SELECT id FROM panel_fleet_groups WHERE id = $1`, [groupId]);
        if (!result.rows[0])
            throw new common_1.NotFoundException('Grupo não encontrado');
    }
    async findMember(groupId, plate) {
        const result = await this.db.panel(`SELECT id, group_id, plate, branch_code, driver_name, vehicle_type, owner_code, service_override, notes, updated_at
       FROM panel_fleet_group_members
       WHERE group_id = $1 AND plate = $2`, [groupId, plate]);
        return result.rows[0] ? this.memberDto(result.rows[0]) : null;
    }
    memberDto(row) {
        return {
            id: Number(row.id),
            group_id: Number(row.group_id),
            plate: row.plate,
            base_code: row.branch_code,
            driver_name: row.driver_name,
            vehicle_type: row.vehicle_type,
            owner_code: row.owner_code,
            service_override: row.service_override,
            notes: row.notes,
            updated_at: row.updated_at
        };
    }
    audit(actor, action, entityId, beforeData, afterData) {
        return this.db.panel(`INSERT INTO panel_audit_logs(action, entity, entity_id, actor_user_id, actor_email, actor_role, before_data, after_data)
       VALUES ($1, 'panel_fleet_group_members', $2, $3, $4, $5, $6::jsonb, $7::jsonb)`, [action, entityId, actor.sub, actor.email, actor.role, JSON.stringify(beforeData), JSON.stringify(afterData)]);
    }
};
exports.FleetMappingService = FleetMappingService;
exports.FleetMappingService = FleetMappingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        branches_service_1.BranchesService])
], FleetMappingService);
//# sourceMappingURL=fleet-mapping.service.js.map