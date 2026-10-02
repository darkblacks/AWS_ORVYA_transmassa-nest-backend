import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '../common/auth.guard'
import { CurrentUser } from '../common/current-user.decorator'
import { AuthUser } from '../common/types'
import { UpsertMemberDto } from './fleet-mapping.dto'
import { FleetMappingService } from './fleet-mapping.service'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type UploadedExcelFile = {
  buffer: Uint8Array
  originalname?: string
  mimetype?: string
  size?: number
}

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

  @Get('groups/:id/excel-export')
  async exportExcel(@Param('id', ParseIntPipe) id: number) {
    const buffer = await this.mapping.exportExcel(id)
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="fleet-mapping.xlsx"',
      length: buffer.length
    })
  }

  @Get('groups/:id/excel-template')
  async excelTemplate(@Param('id', ParseIntPipe) id: number) {
    const buffer = await this.mapping.excelTemplate(id)
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="fleet-mapping-template.xlsx"',
      length: buffer.length
    })
  }

  @Post('groups/:id/excel-import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async importExcel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: UploadedExcelFile
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException({ detail: 'Envie um arquivo .xlsx no campo file.' })
    }
    if (file.originalname && !file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException({ detail: 'O arquivo deve estar no formato .xlsx.' })
    }
    return this.mapping.importExcel(user, id, file.buffer)
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
