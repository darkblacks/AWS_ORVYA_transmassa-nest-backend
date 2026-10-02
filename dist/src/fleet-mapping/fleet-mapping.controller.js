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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FleetMappingController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const auth_guard_1 = require("../common/auth.guard");
const current_user_decorator_1 = require("../common/current-user.decorator");
const fleet_mapping_dto_1 = require("./fleet-mapping.dto");
const fleet_mapping_service_1 = require("./fleet-mapping.service");
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
let FleetMappingController = class FleetMappingController {
    mapping;
    constructor(mapping) {
        this.mapping = mapping;
    }
    groups() {
        return this.mapping.groups();
    }
    baseCodes() {
        return this.mapping.baseCodes();
    }
    members(id) {
        return this.mapping.members(id);
    }
    async exportExcel(id) {
        const buffer = await this.mapping.exportExcel(id);
        return new common_1.StreamableFile(buffer, {
            type: XLSX_MIME,
            disposition: 'attachment; filename="fleet-mapping.xlsx"',
            length: buffer.length
        });
    }
    async excelTemplate(id) {
        const buffer = await this.mapping.excelTemplate(id);
        return new common_1.StreamableFile(buffer, {
            type: XLSX_MIME,
            disposition: 'attachment; filename="fleet-mapping-template.xlsx"',
            length: buffer.length
        });
    }
    async importExcel(user, id, file) {
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException({ detail: 'Envie um arquivo .xlsx no campo file.' });
        }
        if (file.originalname && !file.originalname.toLowerCase().endsWith('.xlsx')) {
            throw new common_1.BadRequestException({ detail: 'O arquivo deve estar no formato .xlsx.' });
        }
        return this.mapping.importExcel(user, id, file.buffer);
    }
    upsertMember(user, id, plate, dto) {
        return this.mapping.upsertMember(user, id, plate, dto);
    }
    deleteMember(user, id, plate) {
        return this.mapping.deleteMember(user, id, plate);
    }
    audit(query) {
        return this.mapping.auditLogs(query);
    }
};
exports.FleetMappingController = FleetMappingController;
__decorate([
    (0, common_1.Get)('groups'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FleetMappingController.prototype, "groups", null);
__decorate([
    (0, common_1.Get)('base-codes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FleetMappingController.prototype, "baseCodes", null);
__decorate([
    (0, common_1.Get)('groups/:id/members'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], FleetMappingController.prototype, "members", null);
__decorate([
    (0, common_1.Get)('groups/:id/excel-export'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FleetMappingController.prototype, "exportExcel", null);
__decorate([
    (0, common_1.Get)('groups/:id/excel-template'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FleetMappingController.prototype, "excelTemplate", null);
__decorate([
    (0, common_1.Post)('groups/:id/excel-import'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], FleetMappingController.prototype, "importExcel", null);
__decorate([
    (0, common_1.Put)('groups/:id/members/:plate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Param)('plate')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, String, fleet_mapping_dto_1.UpsertMemberDto]),
    __metadata("design:returntype", void 0)
], FleetMappingController.prototype, "upsertMember", null);
__decorate([
    (0, common_1.Delete)('groups/:id/members/:plate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Param)('plate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, String]),
    __metadata("design:returntype", void 0)
], FleetMappingController.prototype, "deleteMember", null);
__decorate([
    (0, common_1.Get)('audit'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FleetMappingController.prototype, "audit", null);
exports.FleetMappingController = FleetMappingController = __decorate([
    (0, common_1.Controller)('api/fleet-mapping'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [fleet_mapping_service_1.FleetMappingService])
], FleetMappingController);
//# sourceMappingURL=fleet-mapping.controller.js.map