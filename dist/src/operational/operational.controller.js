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
exports.OperationalController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../common/auth.guard");
const operational_service_1 = require("./operational.service");
let OperationalController = class OperationalController {
    operational;
    constructor(operational) {
        this.operational = operational;
    }
    health() {
        return this.operational.health();
    }
    overview() {
        return this.operational.overview();
    }
    manifestDetail(id) {
        return this.operational.manifestDetail(id);
    }
    maintenanceDetail(plate) {
        return this.operational.maintenanceDetail(plate);
    }
    fleetCatalog() {
        return this.operational.fleetCatalog();
    }
};
exports.OperationalController = OperationalController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OperationalController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('api/tv/overview'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OperationalController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('api/tv/manifest/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], OperationalController.prototype, "manifestDetail", null);
__decorate([
    (0, common_1.Get)('api/tv/maintenance/:plate'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('plate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OperationalController.prototype, "maintenanceDetail", null);
__decorate([
    (0, common_1.Get)('api/tv/fleet-catalog'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OperationalController.prototype, "fleetCatalog", null);
exports.OperationalController = OperationalController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [operational_service_1.OperationalService])
], OperationalController);
//# sourceMappingURL=operational.controller.js.map