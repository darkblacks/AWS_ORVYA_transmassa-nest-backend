import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthUser } from './types'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: AuthUser }>()
    const header = request.headers.authorization || ''
    const [type, token] = header.split(' ')

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Login necessário')
    }

    try {
      request.user = this.jwt.verify<AuthUser>(token)
      return true
    } catch {
      throw new UnauthorizedException('Sessão inválida')
    }
  }
}
