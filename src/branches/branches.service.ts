import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { AuthUser } from '../common/types'
import { DatabaseService } from '../database/database.service'

interface BranchRow {
  code: string
  name: string
  display_name: string
  aliases: string[]
  immutable: boolean
  active: boolean
}

const LOCKED_BRANCHES = new Set(['RJ', 'RB', 'SP'])

@Injectable()
export class BranchesService {
  constructor(private readonly db: DatabaseService) {}

  private dto(row: BranchRow) {
    return {
      code: row.code,
      name: row.name,
      displayName: row.display_name,
      aliases: row.aliases,
      immutable: row.immutable,
      active: row.active
    }
  }

  async list() {
    const result = await this.db.panel<BranchRow>(
      `SELECT code, name, display_name, aliases, immutable, active
       FROM panel_branches
       ORDER BY CASE code WHEN 'RJ' THEN 1 WHEN 'SP' THEN 2 WHEN 'RB' THEN 3 ELSE 99 END, code`
    )
    return result.rows.map(row => this.dto(row))
  }

  async adminUpsert(actor: AuthUser, input: { code: string; name: string; displayName?: string; aliases?: string[]; active?: boolean }) {
    const code = input.code.trim().toUpperCase()
    if (LOCKED_BRANCHES.has(code)) {
      throw new BadRequestException('RJ, RB e SP são filiais fixas e não podem ser alteradas por endpoint')
    }

    const before = await this.find(code)
    const aliases = [...new Set([code, ...(input.aliases || [])].map(item => item.trim().toUpperCase()).filter(Boolean))]
    const displayName = input.displayName?.trim() || `${code} - ${input.name.trim()}`
    const result = await this.db.panel<BranchRow>(
      `INSERT INTO panel_branches(code, name, display_name, aliases, immutable, active)
       VALUES ($1, $2, $3, $4, FALSE, COALESCE($5, TRUE))
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         display_name = EXCLUDED.display_name,
         aliases = EXCLUDED.aliases,
         active = EXCLUDED.active,
         updated_at = NOW()
       WHERE panel_branches.immutable = FALSE
       RETURNING code, name, display_name, aliases, immutable, active`,
      [code, input.name.trim(), displayName, aliases, input.active ?? null]
    )

    const after = result.rows[0]
    if (!after) throw new BadRequestException('Filial fixa não pode ser alterada')
    await this.audit(actor, before ? 'BRANCH_UPDATE' : 'BRANCH_CREATE', code, before, this.dto(after))
    return this.dto(after)
  }

  private async find(code: string) {
    const result = await this.db.panel<BranchRow>(
      `SELECT code, name, display_name, aliases, immutable, active
       FROM panel_branches WHERE code = $1`,
      [code]
    )
    return result.rows[0] ? this.dto(result.rows[0]) : null
  }

  async requireBranch(code: string): Promise<void> {
    const result = await this.db.panel<{ code: string }>(
      `SELECT code FROM panel_branches WHERE code = $1 AND active = TRUE`,
      [code]
    )
    if (!result.rows[0]) throw new NotFoundException('Filial não encontrada')
  }

  private audit(actor: AuthUser, action: string, entityId: string, beforeData: unknown, afterData: unknown) {
    return this.db.panel(
      `INSERT INTO panel_audit_logs(action, entity, entity_id, actor_user_id, actor_email, actor_role, before_data, after_data)
       VALUES ($1, 'panel_branches', $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
      [action, entityId, actor.sub, actor.email, actor.role, JSON.stringify(beforeData), JSON.stringify(afterData)]
    )
  }
}
