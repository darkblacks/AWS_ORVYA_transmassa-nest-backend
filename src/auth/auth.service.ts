import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { DatabaseService } from '../database/database.service'
import { AuthUser, Role } from '../common/types'

interface UserRow {
  id: string
  name: string
  username: string
  email: string
  password_hash: string
  role: Role
  active: boolean
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService
  ) {}

  normalizeLogin(value: string): { username: string; email: string } {
    const raw = value.trim().toLowerCase()
    const username = raw.includes('@') ? raw.split('@')[0] : raw
    return {
      username,
      email: `${username}@transmassa.local`
    }
  }

  async login(usernameOrEmail: string, password: string) {
    const login = this.normalizeLogin(usernameOrEmail)
    const result = await this.db.panel<UserRow>(
      `SELECT id, name, username, email, password_hash, role, active
       FROM panel_users
       WHERE username = $1 OR email = $2
       LIMIT 1`,
      [login.username, login.email]
    )
    const user = result.rows[0]

    if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Usuário ou senha inválidos')
    }

    const payload: AuthUser = {
      sub: Number(user.id),
      email: user.email,
      role: user.role
    }

    return {
      token: this.jwt.sign(payload),
      user: {
        id: Number(user.id),
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    }
  }

  async me(user: AuthUser) {
    const result = await this.db.panel<UserRow>(
      `SELECT id, name, username, email, role, active
       FROM panel_users
       WHERE id = $1 AND active = TRUE`,
      [user.sub]
    )
    const found = result.rows[0]
    if (!found) throw new UnauthorizedException('Usuário inativo')
    return {
      user: {
        id: Number(found.id),
        name: found.name,
        username: found.username,
        email: found.email,
        role: found.role
      }
    }
  }
}
