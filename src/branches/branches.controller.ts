import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../common/admin.guard'
import { AuthGuard } from '../common/auth.guard'
import { CurrentUser } from '../common/current-user.decorator'
import { AuthUser } from '../common/types'
import { UpsertBranchDto } from './branches.dto'
import { BranchesService } from './branches.service'

@Controller('api/branches')
@UseGuards(AuthGuard)
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  list() {
    return this.branches.list()
  }

  @Put('admin')
  @UseGuards(AdminGuard)
  adminUpsert(@CurrentUser() actor: AuthUser, @Body() dto: UpsertBranchDto) {
    return this.branches.adminUpsert(actor, dto)
  }
}
