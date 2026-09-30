import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { AuthUser, Role } from '../common/types'
import { DatabaseService } from '../database/database.service'

interface UserRow {
  id: string
  name: string
  username: string
  email: string
  role: Role
  active: boolean
  created_at: Date
  updated_at: Date
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  private normalizeUsername(value: string): string {
    return value.trim().toLowerCase().replace(/@transmassa\.local$/, '')
  }

  private publicUser(row: UserRow) {
    return {
      id: Number(row.id),
      name: row.name,
      username: row.username,
      email: row.email,
      role: row.role,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async list() {
    const result = await this.db.panel<UserRow>(
      `SELECT id, name, username, email, role, active, created_at, updated_at
       FROM panel_users
       ORDER BY id`
    )
    return result.rows.map(row => this.publicUser(row))
  }

  async create(actor: AuthUser, input: { name: string; username: string; password: string; role: Role }) {
    const username = this.normalizeUsername(input.username)
    const email = `${username}@transmassa.local`
    const passwordHash = await bcrypt.hash(input.password, 10)

    try {
      const result = await this.db.panel<UserRow>(
        `INSERT INTO panel_users(name, username, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, username, email, role, active, created_at, updated_at`,
        [input.name.trim(), username, email, passwordHash, input.role]
      )
      await this.audit(actor, 'USER_CREATE', String(result.rows[0].id), null, this.publicUser(result.rows[0]))
      return this.publicUser(result.rows[0])
    } catch (error) {
      if (String(error).includes('duplicate key')) throw new ConflictException('Usuário já existe')
      throw error
    }
  }

  async update(actor: AuthUser, id: number, input: { name?: string; role?: Role; active?: boolean }) {
    const before = await this.getRow(id)
    const result = await this.db.panel<UserRow>(
      `UPDATE panel_users
       SET name = COALESCE($2, name),
           role = COALESCE($3, role),
           active = COALESCE($4, active),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, username, email, role, active, created_at, updated_at`,
      [id, input.name?.trim() || null, input.role || null, input.active ?? null]
    )
    const after = this.publicUser(result.rows[0])
    await this.audit(actor, 'USER_UPDATE', String(id), this.publicUser(before), after)
    return after
  }

  async changePassword(actor: AuthUser, id: number, password: string) {
    await this.getRow(id)
    const passwordHash = await bcrypt.hash(password, 10)
    await this.db.panel(
      `UPDATE panel_users SET password_hash = $2, updated_at = NOW() WHERE id = $1`,
      [id, passwordHash]
    )
    await this.audit(actor, 'USER_PASSWORD_RESET', String(id), null, { id })
    return { ok: true }
  }

  private async getRow(id: number): Promise<UserRow> {
    const result = await this.db.panel<UserRow>(
      `SELECT id, name, username, email, role, active, created_at, updated_at
       FROM panel_users
       WHERE id = $1`,
      [id]
    )
    if (!result.rows[0]) throw new NotFoundException('Usuário não encontrado')
    return result.rows[0]
  }

  private audit(actor: AuthUser, action: string, entityId: string, beforeData: unknown, afterData: unknown) {
    return this.db.panel(
      `INSERT INTO panel_audit_logs(action, entity, entity_id, actor_user_id, actor_email, actor_role, before_data, after_data)
       VALUES ($1, 'panel_users', $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
      [action, entityId, actor.sub, actor.email, actor.role, JSON.stringify(beforeData), JSON.stringify(afterData)]
    )
  }
}
