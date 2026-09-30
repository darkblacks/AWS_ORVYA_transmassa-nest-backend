import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../common/current-user.decorator'
import { AuthGuard } from '../common/auth.guard'
import { AuthUser } from '../common/types'
import { AuthService } from './auth.service'
import { LoginDto } from './auth.dto'

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password)
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user)
  }
}
