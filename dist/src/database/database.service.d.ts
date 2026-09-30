import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RowDataPacket } from 'mysql2/promise';
export declare class DatabaseService implements OnModuleDestroy {
    private readonly config;
    private readonly panelPool;
    private readonly operationalPool;
    constructor(config: ConfigService);
    panel<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{
        rows: T[];
        rowCount: number | null;
    }>;
    operational<T = RowDataPacket>(sql: string, params?: Array<string | number | boolean | Date | null>): Promise<T[]>;
    onModuleDestroy(): Promise<void>;
}
