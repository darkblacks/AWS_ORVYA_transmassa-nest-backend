import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../common/auth.guard'
import { CurrentUser } from '../common/current-user.decorator'
import { AuthUser } from '../common/types'
import { UpsertMemberDto } from './fleet-mapping.dto'
import { FleetMappingService } from './fleet-mapping.service'

@Controller('api/fleet-mapping')
@UseGuards(AuthGuard)
export class FleetMappingController {
  constructor(private readonly mapping: FleetMappingService) {}

  @Get('groups')
  groups() {
    return this.mapping.groups()
  }

  @Get('base-codes')
  baseCodes() {
    return this.mapping.baseCodes()
  }

  @Get('groups/:id/members')
  members(@Param('id', ParseIntPipe) id: number) {
    return this.mapping.members(id)
  }

  @Put('groups/:id/members/:plate')
  upsertMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('plate') plate: string,
    @Body() dto: UpsertMemberDto
  ) {
    return this.mapping.upsertMember(user, id, plate, dto)
  }

  @Delete('groups/:id/members/:plate')
  deleteMember(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Param('plate') plate: string) {
    return this.mapping.deleteMember(user, id, plate)
  }

  @Get('audit')
  audit(@Query() query: { group_id?: string; plate?: string; limit?: string }) {
    return this.mapping.auditLogs(query)
  }
}
