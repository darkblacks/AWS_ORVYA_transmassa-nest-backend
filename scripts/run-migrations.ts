import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.PANEL_PG_HOST || '127.0.0.1',
  port: Number(process.env.PANEL_PG_PORT || 5432),
  database: process.env.PANEL_PG_DATABASE,
  user: process.env.PANEL_PG_USER,
  password: process.env.PANEL_PG_PASSWORD
})

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS panel_schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const dir = path.resolve(process.cwd(), 'db/migrations')
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.sql')).sort()
  for (const file of files) {
    const exists = await pool.query('SELECT 1 FROM panel_schema_migrations WHERE filename = $1', [file])
    if (exists.rowCount) continue
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    process.stdout.write(`Applying ${file}... `)
    await pool.query(sql)
    await pool.query('INSERT INTO panel_schema_migrations(filename) VALUES ($1)', [file])
    process.stdout.write('ok\n')
  }
}

main()
  .finally(() => pool.end())
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
