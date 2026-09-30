import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { AuthUser } from './types'

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>()
    if (request.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admin pode executar esta ação')
    }
    return true
  }
}
