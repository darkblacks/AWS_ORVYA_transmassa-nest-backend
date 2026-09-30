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
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mysql = require("mysql2/promise");
const pg_1 = require("pg");
let DatabaseService = class DatabaseService {
    config;
    panelPool;
    operationalPool;
    constructor(config) {
        this.config = config;
        this.panelPool = new pg_1.Pool({
            host: this.config.get('PANEL_PG_HOST') || '127.0.0.1',
            port: Number(this.config.get('PANEL_PG_PORT') || 5432),
            database: this.config.get('PANEL_PG_DATABASE'),
            user: this.config.get('PANEL_PG_USER'),
            password: this.config.get('PANEL_PG_PASSWORD'),
            max: 10,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 10_000
        });
        this.operationalPool = mysql.createPool({
            host: this.config.get('OPERATIONAL_MYSQL_HOST'),
            port: Number(this.config.get('OPERATIONAL_MYSQL_PORT') || 3306),
            user: this.config.get('OPERATIONAL_MYSQL_USER'),
            password: this.config.get('OPERATIONAL_MYSQL_PASSWORD'),
            database: this.config.get('OPERATIONAL_MYSQL_DATABASE') || 'transmassa',
            waitForConnections: true,
            connectionLimit: Number(this.config.get('OPERATIONAL_MYSQL_POOL') || 8),
            queueLimit: 0,
            connectTimeout: 12_000,
            enableKeepAlive: true,
            charset: 'utf8mb4'
        });
    }
    async panel(sql, params = []) {
        const result = await this.panelPool.query(sql, params);
        return { rows: result.rows, rowCount: result.rowCount };
    }
    async operational(sql, params = []) {
        const [rows] = await this.operationalPool.execute(sql, params);
        return rows;
    }
    async onModuleDestroy() {
        await this.panelPool.end();
        await this.operationalPool.end();
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DatabaseService);
//# sourceMappingURL=database.service.js.map