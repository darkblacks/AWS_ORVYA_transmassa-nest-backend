import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as mysql from 'mysql2/promise'
import { Pool as MysqlPool, RowDataPacket } from 'mysql2/promise'
import { Pool as PgPool } from 'pg'

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly panelPool: PgPool
  private readonly operationalPool: MysqlPool

  constructor(private readonly config: ConfigService) {
    this.panelPool = new PgPool({
      host: this.config.get('PANEL_PG_HOST') || '127.0.0.1',
      port: Number(this.config.get('PANEL_PG_PORT') || 5432),
      database: this.config.get('PANEL_PG_DATABASE'),
      user: this.config.get('PANEL_PG_USER'),
      password: this.config.get('PANEL_PG_PASSWORD'),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000
    })

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
    })
  }

  async panel<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<{ rows: T[]; rowCount: number | null }> {
    const result = await this.panelPool.query(sql, params)
    return { rows: result.rows as T[], rowCount: result.rowCount }
  }

  async operational<T = RowDataPacket>(sql: string, params: Array<string | number | boolean | Date | null> = []): Promise<T[]> {
    const [rows] = await this.operationalPool.execute<RowDataPacket[]>(sql, params)
    return rows as T[]
  }

  async onModuleDestroy() {
    await this.panelPool.end()
    await this.operationalPool.end()
  }
}
