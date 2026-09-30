import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
export declare class OperationalService {
    private readonly db;
    private readonly config;
    constructor(db: DatabaseService, config: ConfigService);
    cleanPlate(value?: unknown): string;
    health(): Promise<{
        ok: boolean;
        mysql: boolean;
        panelDb: boolean;
        service: string;
    }>;
    fleetCatalog(): Promise<{
        plate: string;
        vehicleType: string;
        source: string;
    }[]>;
    overview(): Promise<any>;
    private getFleet;
    private getActiveManifests;
    private getOpenMaintenance;
    private maintenanceDto;
    maintenanceDetail(plateRaw: string): Promise<any>;
    private getMappingRows;
    private hasOperationalService;
    private statusForMany;
    private ownershipFromManifest;
    private manifestDto;
    manifestDetail(id: number): Promise<any>;
    private classifyManifestService;
    private normalizeBranchLabel;
    private destinationBaseFromFreights;
    private formatFreightAddress;
    private contextFromRows;
    private getOperationContexts;
    private operationKind;
    private loadKg;
    private breakdown;
}
