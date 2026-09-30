import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../common/auth.guard'
import { AdminGuard } from '../common/admin.guard'
import { CurrentUser } from '../common/current-user.decorator'
import { AuthUser } from '../common/types'
import { ChangePasswordDto, CreateUserDto, UpdateUserDto } from './users.dto'
import { UsersService } from './users.service'

@Controller('api/admin/users')
@UseGuards(AuthGuard, AdminGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list()
  }

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(actor, dto)
  }

  @Patch(':id')
  update(@CurrentUser() actor: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.users.update(actor, id, dto)
  }

  @Post(':id/password')
  changePassword(@CurrentUser() actor: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(actor, id, dto.password)
  }
}
