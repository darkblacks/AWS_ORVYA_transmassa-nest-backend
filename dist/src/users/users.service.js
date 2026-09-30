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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const database_service_1 = require("../database/database.service");
let UsersService = class UsersService {
    db;
    constructor(db) {
        this.db = db;
    }
    normalizeUsername(value) {
        return value.trim().toLowerCase().replace(/@transmassa\.local$/, '');
    }
    publicUser(row) {
        return {
            id: Number(row.id),
            name: row.name,
            username: row.username,
            email: row.email,
            role: row.role,
            active: row.active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    async list() {
        const result = await this.db.panel(`SELECT id, name, username, email, role, active, created_at, updated_at
       FROM panel_users
       ORDER BY id`);
        return result.rows.map(row => this.publicUser(row));
    }
    async create(actor, input) {
        const username = this.normalizeUsername(input.username);
        const email = `${username}@transmassa.local`;
        const passwordHash = await bcrypt.hash(input.password, 10);
        try {
            const result = await this.db.panel(`INSERT INTO panel_users(name, username, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, username, email, role, active, created_at, updated_at`, [input.name.trim(), username, email, passwordHash, input.role]);
            await this.audit(actor, 'USER_CREATE', String(result.rows[0].id), null, this.publicUser(result.rows[0]));
            return this.publicUser(result.rows[0]);
        }
        catch (error) {
            if (String(error).includes('duplicate key'))
                throw new common_1.ConflictException('Usuário já existe');
            throw error;
        }
    }
    async update(actor, id, input) {
        const before = await this.getRow(id);
        const result = await this.db.panel(`UPDATE panel_users
       SET name = COALESCE($2, name),
           role = COALESCE($3, role),
           active = COALESCE($4, active),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, username, email, role, active, created_at, updated_at`, [id, input.name?.trim() || null, input.role || null, input.active ?? null]);
        const after = this.publicUser(result.rows[0]);
        await this.audit(actor, 'USER_UPDATE', String(id), this.publicUser(before), after);
        return after;
    }
    async changePassword(actor, id, password) {
        await this.getRow(id);
        const passwordHash = await bcrypt.hash(password, 10);
        await this.db.panel(`UPDATE panel_users SET password_hash = $2, updated_at = NOW() WHERE id = $1`, [id, passwordHash]);
        await this.audit(actor, 'USER_PASSWORD_RESET', String(id), null, { id });
        return { ok: true };
    }
    async getRow(id) {
        const result = await this.db.panel(`SELECT id, name, username, email, role, active, created_at, updated_at
       FROM panel_users
       WHERE id = $1`, [id]);
        if (!result.rows[0])
            throw new common_1.NotFoundException('Usuário não encontrado');
        return result.rows[0];
    }
    audit(actor, action, entityId, beforeData, afterData) {
        return this.db.panel(`INSERT INTO panel_audit_logs(action, entity, entity_id, actor_user_id, actor_email, actor_role, before_data, after_data)
       VALUES ($1, 'panel_users', $2, $3, $4, $5, $6::jsonb, $7::jsonb)`, [action, entityId, actor.sub, actor.email, actor.role, JSON.stringify(beforeData), JSON.stringify(afterData)]);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], UsersService);
//# sourceMappingURL=users.service.js.map