import { OperationalService } from './operational.service';
export declare class OperationalController {
    private readonly operational;
    constructor(operational: OperationalService);
    health(): Promise<{
        ok: boolean;
        mysql: boolean;
        panelDb: boolean;
        service: string;
    }>;
    overview(): Promise<any>;
    manifestDetail(id: number): Promise<any>;
    maintenanceDetail(plate: string): Promise<any>;
    fleetCatalog(): Promise<{
        plate: string;
        vehicleType: string;
        source: string;
    }[]>;
}
