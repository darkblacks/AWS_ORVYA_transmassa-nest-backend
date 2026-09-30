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
exports.BranchesService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const LOCKED_BRANCHES = new Set(['RJ', 'RB', 'SP']);
let BranchesService = class BranchesService {
    db;
    constructor(db) {
        this.db = db;
    }
    dto(row) {
        return {
            code: row.code,
            name: row.name,
            displayName: row.display_name,
            aliases: row.aliases,
            immutable: row.immutable,
            active: row.active
        };
    }
    async list() {
        const result = await this.db.panel(`SELECT code, name, display_name, aliases, immutable, active
       FROM panel_branches
       ORDER BY CASE code WHEN 'RJ' THEN 1 WHEN 'SP' THEN 2 WHEN 'RB' THEN 3 ELSE 99 END, code`);
        return result.rows.map(row => this.dto(row));
    }
    async adminUpsert(actor, input) {
        const code = input.code.trim().toUpperCase();
        if (LOCKED_BRANCHES.has(code)) {
            throw new common_1.BadRequestException('RJ, RB e SP são filiais fixas e não podem ser alteradas por endpoint');
        }
        const before = await this.find(code);
        const aliases = [...new Set([code, ...(input.aliases || [])].map(item => item.trim().toUpperCase()).filter(Boolean))];
        const displayName = input.displayName?.trim() || `${code} - ${input.name.trim()}`;
        const result = await this.db.panel(`INSERT INTO panel_branches(code, name, display_name, aliases, immutable, active)
       VALUES ($1, $2, $3, $4, FALSE, COALESCE($5, TRUE))
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         display_name = EXCLUDED.display_name,
         aliases = EXCLUDED.aliases,
         active = EXCLUDED.active,
         updated_at = NOW()
       WHERE panel_branches.immutable = FALSE
       RETURNING code, name, display_name, aliases, immutable, active`, [code, input.name.trim(), displayName, aliases, input.active ?? null]);
        const after = result.rows[0];
        if (!after)
            throw new common_1.BadRequestException('Filial fixa não pode ser alterada');
        await this.audit(actor, before ? 'BRANCH_UPDATE' : 'BRANCH_CREATE', code, before, this.dto(after));
        return this.dto(after);
    }
    async find(code) {
        const result = await this.db.panel(`SELECT code, name, display_name, aliases, immutable, active
       FROM panel_branches WHERE code = $1`, [code]);
        return result.rows[0] ? this.dto(result.rows[0]) : null;
    }
    async requireBranch(code) {
        const result = await this.db.panel(`SELECT code FROM panel_branches WHERE code = $1 AND active = TRUE`, [code]);
        if (!result.rows[0])
            throw new common_1.NotFoundException('Filial não encontrada');
    }
    audit(actor, action, entityId, beforeData, afterData) {
        return this.db.panel(`INSERT INTO panel_audit_logs(action, entity, entity_id, actor_user_id, actor_email, actor_role, before_data, after_data)
       VALUES ($1, 'panel_branches', $2, $3, $4, $5, $6::jsonb, $7::jsonb)`, [action, entityId, actor.sub, actor.email, actor.role, JSON.stringify(beforeData), JSON.stringify(afterData)]);
    }
};
exports.BranchesService = BranchesService;
exports.BranchesService = BranchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], BranchesService);
//# sourceMappingURL=branches.service.js.map