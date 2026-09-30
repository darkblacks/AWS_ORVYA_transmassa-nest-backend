"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationalModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const fleet_mapping_module_1 = require("../fleet-mapping/fleet-mapping.module");
const operational_controller_1 = require("./operational.controller");
const operational_service_1 = require("./operational.service");
let OperationalModule = class OperationalModule {
};
exports.OperationalModule = OperationalModule;
exports.OperationalModule = OperationalModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, fleet_mapping_module_1.FleetMappingModule],
        controllers: [operational_controller_1.OperationalController],
        providers: [operational_service_1.OperationalService]
    })
], OperationalModule);
//# sourceMappingURL=operational.module.js.map