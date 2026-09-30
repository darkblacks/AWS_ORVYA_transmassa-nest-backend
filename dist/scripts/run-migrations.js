"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    host: process.env.PANEL_PG_HOST || '127.0.0.1',
    port: Number(process.env.PANEL_PG_PORT || 5432),
    database: process.env.PANEL_PG_DATABASE,
    user: process.env.PANEL_PG_USER,
    password: process.env.PANEL_PG_PASSWORD
});
async function main() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS panel_schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    const dir = node_path_1.default.resolve(process.cwd(), 'db/migrations');
    const files = node_fs_1.default.readdirSync(dir).filter(file => file.endsWith('.sql')).sort();
    for (const file of files) {
        const exists = await pool.query('SELECT 1 FROM panel_schema_migrations WHERE filename = $1', [file]);
        if (exists.rowCount)
            continue;
        const sql = node_fs_1.default.readFileSync(node_path_1.default.join(dir, file), 'utf8');
        process.stdout.write(`Applying ${file}... `);
        await pool.query(sql);
        await pool.query('INSERT INTO panel_schema_migrations(filename) VALUES ($1)', [file]);
        process.stdout.write('ok\n');
    }
}
main()
    .finally(() => pool.end())
    .catch(error => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=run-migrations.js.map