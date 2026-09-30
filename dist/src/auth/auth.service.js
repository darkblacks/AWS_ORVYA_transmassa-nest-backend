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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const database_service_1 = require("../database/database.service");
let AuthService = class AuthService {
    db;
    jwt;
    constructor(db, jwt) {
        this.db = db;
        this.jwt = jwt;
    }
    normalizeLogin(value) {
        const raw = value.trim().toLowerCase();
        const username = raw.includes('@') ? raw.split('@')[0] : raw;
        return {
            username,
            email: `${username}@transmassa.local`
        };
    }
    async login(usernameOrEmail, password) {
        const login = this.normalizeLogin(usernameOrEmail);
        const result = await this.db.panel(`SELECT id, name, username, email, password_hash, role, active
       FROM panel_users
       WHERE username = $1 OR email = $2
       LIMIT 1`, [login.username, login.email]);
        const user = result.rows[0];
        if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) {
            throw new common_1.UnauthorizedException('Usuário ou senha inválidos');
        }
        const payload = {
            sub: Number(user.id),
            email: user.email,
            role: user.role
        };
        return {
            token: this.jwt.sign(payload),
            user: {
                id: Number(user.id),
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role
            }
        };
    }
    async me(user) {
        const result = await this.db.panel(`SELECT id, name, username, email, role, active
       FROM panel_users
       WHERE id = $1 AND active = TRUE`, [user.sub]);
        const found = result.rows[0];
        if (!found)
            throw new common_1.UnauthorizedException('Usuário inativo');
        return {
            user: {
                id: Number(found.id),
                name: found.name,
                username: found.username,
                email: found.email,
                role: found.role
            }
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map