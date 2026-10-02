import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import * as ExcelJS from 'exceljs'
import { BranchesService } from '../branches/branches.service'
import { AuthUser } from '../common/types'
import { DatabaseService } from '../database/database.service'

interface GroupRow {
  id: string
  name: string
  slug: string
  is_system: boolean
  total_members: string
}
interface MemberRow {
  id: string
  group_id: string
  plate: string
  branch_code: string | null
  driver_name: string | null
  vehicle_type: string | null
  owner_code: string | null
  service_override: string | null
  notes: string | null
  updated_at: Date
}

interface MemberDto {
  id: number
  group_id: number
  plate: string
  base_code: string | null
  driver_name: string | null
  vehicle_type: string | null
  owner_code: string | null
  service_override: string | null
  notes: string | null
  updated_at: Date
}


type ImportMember = Pick<
  MemberRow,
  'branch_code' | 'driver_name' | 'vehicle_type' | 'owner_code' | 'service_override' | 'notes'
> & {
  rowNumber: number
  plate: string
}

const VEHICLE_TYPES = [
  'Moto',
  'Passeio',
  'Pickup',
  'Fiorino, Partner, Kangoo / Furgão Leve',
  'Kombi / Van Leve',
  'Ducato / Van',
  'HR, Accelo / Caminhão Leve',
  'VUC / Caminhão Leve',
  'Toco',
  'Truck',
  'Bi-Truck',
  'Cavalo Mecânico',
  'Carreta Refrigerada'
]

const EXCEL_HEADERS = [
  'PLACA',
  'FILIAL',
  'TIPO_CORRIGIDO',
  'VINCULO',
  'TERCEIRO_CODIGO',
  'MOTORISTA',
  'SERVICO_OVERRIDE',
  'OBSERVACOES'
]

@Injectable()
export class FleetMappingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly branches: BranchesService
  ) {}
  cleanPlate(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  }
  async groups() {
    const result = await this.db.panel<GroupRow>(
      `SELECT g.id, g.name, g.slug, g.is_system, COUNT(m.id)::text AS total_members
       FROM panel_fleet_groups g
       LEFT JOIN panel_fleet_group_members m ON m.group_id = g.id
       GROUP BY g.id
       ORDER BY g.is_system DESC, g.name`
    )
    const groups = result.rows.map(row => ({
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
      is_shared: true,
      is_system: row.is_system,
      member_count: Number(row.total_members),
      bases: []
    }))
    return { groups }
  }
  async baseCodes() {
    const result = await this.db.panel<{ code: string; display_name: string }>(
      `SELECT code, display_name FROM panel_branches WHERE active = TRUE ORDER BY code`
    )
    return { items: result.rows.map(row => ({ code: row.code, label: row.display_name, active: true })) }
  }
  async members(groupId: number) {
    await this.requireGroup(groupId)
    const groupResult = await this.db.panel<{ id: string; name: string; slug: string; is_system: boolean }>(
      `SELECT id, name, slug, is_system FROM panel_fleet_groups WHERE id = $1`,
      [groupId]
    )
    const result = await this.db.panel<MemberRow>(
      `SELECT id, group_id, plate, branch_code, driver_name, vehicle_type, owner_code, service_override, notes, updated_at
       FROM panel_fleet_group_members
       WHERE group_id = $1
       ORDER BY branch_code NULLS LAST, plate`,
      [groupId]
    )
    const group = groupResult.rows[0]
    return {
      group: {
        id: Number(group.id),
        name: group.name,
        slug: group.slug,
        is_system: group.is_system,
        is_shared: true
      },
      members: result.rows.map(row => this.memberDto(row))
    }
  }

  async exportExcel(groupId: number): Promise<Buffer> {
    const data = await this.members(groupId)
    return this.buildExcel(data.group.name, data.members)
  }

  async excelTemplate(groupId: number): Promise<Buffer> {
    const groupName = await this.requireGroupName(groupId)
    return this.buildExcel(groupName, [])
  }

  async importExcel(actor: AuthUser, groupId: number, fileBuffer: Buffer) {
    await this.requireGroup(groupId)

    const workbook = new ExcelJS.Workbook()
    try {
      await workbook.xlsx.load(fileBuffer)
    } catch {
      throw new BadRequestException({ detail: 'Não foi possível ler o XLSX. Baixe o modelo e tente novamente.' })
    }

    const worksheet = workbook.getWorksheet('Frota') || workbook.worksheets[0]
    if (!worksheet) {
      throw new BadRequestException({ detail: 'A planilha não contém nenhuma aba para importação.' })
    }

    const headerMap = new Map<string, number>()
    const headerRow = worksheet.getRow(1)
    for (let column = 1; column <= Math.max(headerRow.cellCount, worksheet.columnCount); column += 1) {
      const header = this.normalizeHeader(this.cellText(headerRow.getCell(column).value))
      if (header) headerMap.set(header, column)
    }

    const columns = {
      plate: this.findColumn(headerMap, ['PLACA', 'PLATE']),
      branch: this.findColumn(headerMap, ['FILIAL', 'BASE', 'BASE_CODE', 'BRANCH_CODE']),
      vehicleType: this.findColumn(headerMap, ['TIPO_CORRIGIDO', 'TIPO', 'VEHICLE_TYPE']),
      ownership: this.findColumn(headerMap, ['VINCULO', 'OWNERSHIP']),
      ownerCode: this.findColumn(headerMap, ['TERCEIRO_CODIGO', 'CODIGO_TERCEIRO', 'OWNER_CODE', 'TERCEIRO']),
      driver: this.findColumn(headerMap, ['MOTORISTA', 'DRIVER_NAME']),
      serviceOverride: this.findColumn(headerMap, ['SERVICO_OVERRIDE', 'SERVICO', 'SERVICE_OVERRIDE']),
      notes: this.findColumn(headerMap, ['OBSERVACOES', 'OBSERVACAO', 'NOTES'])
    }

    const requiredColumns: Array<[string, number]> = [
      ['PLACA', columns.plate],
      ['FILIAL', columns.branch],
      ['TIPO_CORRIGIDO', columns.vehicleType],
      ['VINCULO', columns.ownership],
      ['TERCEIRO_CODIGO', columns.ownerCode],
      ['MOTORISTA', columns.driver],
      ['SERVICO_OVERRIDE', columns.serviceOverride],
      ['OBSERVACOES', columns.notes]
    ]
    const missingColumns = requiredColumns.filter(([, column]) => !column).map(([name]) => name)
    if (missingColumns.length) {
      throw new BadRequestException({
        detail: {
          message: 'Cabeçalho inválido.',
          errors: [`Colunas ausentes: ${missingColumns.join(', ')}. Use o modelo gerado pelo painel.`]
        }
      })
    }

    const bases = await this.baseCodes()
    const allowedBranches = new Set(bases.items.map(item => item.code.trim().toUpperCase()))
    const imported: ImportMember[] = []
    const errors: string[] = []
    const seenPlates = new Set<string>()
    let nonEmptyRows = 0

    const read = (row: ExcelJS.Row, column: number): string =>
      column ? this.cellText(row.getCell(column).value) : ''

    for (let rowNumber = 2; rowNumber <= worksheet.actualRowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber)
      const rawValues = Object.values(columns)
        .filter(column => column > 0)
        .map(column => read(row, column))
      if (!rawValues.some(Boolean)) continue

      nonEmptyRows += 1
      if (nonEmptyRows > 5000) {
        errors.push('A planilha excede o limite de 5.000 linhas por importação.')
        break
      }

      const plate = this.cleanPlate(read(row, columns.plate))
      const branchRaw = read(row, columns.branch).trim().toUpperCase()
      const branch = branchRaw.split(/\s+-\s+/)[0].trim()
      const vehicleType = read(row, columns.vehicleType).trim()
      const ownership = this.normalizeHeader(read(row, columns.ownership))
      let ownerCode = read(row, columns.ownerCode).trim().toUpperCase()

      if (!plate) {
        errors.push(`Linha ${rowNumber}: PLACA é obrigatória.`)
      } else if (!/^[A-Z0-9]{7}$/.test(plate)) {
        errors.push(`Linha ${rowNumber}: placa "${plate}" deve ter 7 caracteres alfanuméricos.`)
      } else if (seenPlates.has(plate)) {
        errors.push(`Linha ${rowNumber}: placa ${plate} aparece mais de uma vez no arquivo.`)
      } else {
        seenPlates.add(plate)
      }

      if (branch && !allowedBranches.has(branch)) {
        errors.push(`Linha ${rowNumber}: filial "${branch}" não existe ou está inativa.`)
      }

      if (ownership && !['PROPRIO', 'OWN', 'TERCEIRO', 'THIRD_PARTY', 'THIRDPARTY'].includes(ownership)) {
        errors.push(`Linha ${rowNumber}: VINCULO deve ser PROPRIO ou TERCEIRO.`)
      }

      const ownVehicle = ['PROPRIO', 'OWN'].includes(ownership)
      const thirdPartyVehicle = ['TERCEIRO', 'THIRD_PARTY', 'THIRDPARTY'].includes(ownership)
      if (ownVehicle) ownerCode = ''
      if (thirdPartyVehicle && !ownerCode) {
        errors.push(`Linha ${rowNumber}: TERCEIRO_CODIGO é obrigatório quando VINCULO = TERCEIRO.`)
      }

      imported.push({
        rowNumber,
        plate,
        branch_code: branch || null,
        vehicle_type: vehicleType || null,
        owner_code: ownerCode || null,
        driver_name: read(row, columns.driver).trim() || null,
        service_override: read(row, columns.serviceOverride).trim() || null,
        notes: read(row, columns.notes).trim() || null
      })

      if (errors.length >= 100) break
    }

    if (!nonEmptyRows) {
      throw new BadRequestException({ detail: 'A planilha não contém placas para importar.' })
    }

    if (errors.length) {
      throw new BadRequestException({
        detail: {
          message: 'A importação foi cancelada; nenhum dado foi alterado.',
          errors
        }
      })
    }

    const currentResult = await this.db.panel<MemberRow>(
      `SELECT id, group_id, plate, branch_code, driver_name, vehicle_type, owner_code, service_override, notes, updated_at
       FROM panel_fleet_group_members
       WHERE group_id = $1`,
      [groupId]
    )
    const existingByPlate = new Map(currentResult.rows.map(row => [this.cleanPlate(row.plate), this.memberDto(row)]))
    const created = imported.filter(item => !existingByPlate.has(item.plate)).length
    const updated = imported.length - created

    const result = await this.db.panel<MemberRow>(
      `INSERT INTO panel_fleet_group_members(
         group_id, plate, branch_code, driver_name, vehicle_type, owner_code, service_override, notes, created_by, updated_by
       )
       SELECT $1, data.plate, data.branch_code, data.driver_name, data.vehicle_type,
              data.owner_code, data.service_override, data.notes, $9, $9
       FROM UNNEST(
         $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[]
       ) AS data(plate, branch_code, driver_name, vehicle_type, owner_code, service_override, notes)
       ON CONFLICT (group_id, plate) DO UPDATE SET
         branch_code = EXCLUDED.branch_code,
         driver_name = EXCLUDED.driver_name,
         vehicle_type = EXCLUDED.vehicle_type,
         owner_code = EXCLUDED.owner_code,
         service_override = EXCLUDED.service_override,
         notes = EXCLUDED.notes,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING id, group_id, plate, branch_code, driver_name, vehicle_type, owner_code, service_override, notes, updated_at`,
      [
        groupId,
        imported.map(item => item.plate),
        imported.map(item => item.branch_code),
        imported.map(item => item.driver_name),
        imported.map(item => item.vehicle_type),
        imported.map(item => item.owner_code),
        imported.map(item => item.service_override),
        imported.map(item => item.notes),
        actor.sub
      ]
    )

    const afterByPlate = new Map(result.rows.map(row => [this.cleanPlate(row.plate), this.memberDto(row)]))
    const auditRows = imported.map(item => ({
      action: existingByPlate.has(item.plate) ? 'MAPPING_UPDATE' : 'MAPPING_CREATE',
      entity_id: `${groupId}:${item.plate}`,
      before_data: existingByPlate.get(item.plate) || null,
      after_data: afterByPlate.get(item.plate) || null
    }))

    await this.db.panel(
      `INSERT INTO panel_audit_logs(
         action, entity, entity_id, actor_user_id, actor_email, actor_role, before_data, after_data
       )
       SELECT x.action, 'panel_fleet_group_members', x.entity_id, $2, $3, $4, x.before_data, x.after_data
       FROM jsonb_to_recordset($1::jsonb) AS x(
         action text,
         entity_id text,
         before_data jsonb,
         after_data jsonb
       )`,
      [JSON.stringify(auditRows), actor.sub, actor.email, actor.role]
    )

    return { total: imported.length, created, updated }
  }

  async upsertMember(actor: AuthUser, groupId: number, plateParam: string, input: Partial<MemberRow>) {
    await this.requireGroup(groupId)
    const plate = this.cleanPlate(plateParam)
    const branch = input.branch_code?.trim().toUpperCase() || null
    if (branch) await this.branches.requireBranch(branch)
    const before = await this.findMember(groupId, plate)
    const result = await this.db.panel<MemberRow>(
      `INSERT INTO panel_fleet_group_members(
         group_id, plate, branch_code, driver_name, vehicle_type, owner_code, service_override, notes, created_by, updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       ON CONFLICT (group_id, plate) DO UPDATE SET
         branch_code = EXCLUDED.branch_code,
         driver_name = EXCLUDED.driver_name,
         vehicle_type = EXCLUDED.vehicle_type,
         owner_code = EXCLUDED.owner_code,
         service_override = EXCLUDED.service_override,
         notes = EXCLUDED.notes,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING id, group_id, plate, branch_code, driver_name, vehicle_type, owner_code, service_override, notes, updated_at`,
      [
        groupId,
        plate,
        branch,
        input.driver_name || null,
        input.vehicle_type || null,
        input.owner_code || null,
        input.service_override || null,
        input.notes || null,
        actor.sub
      ]
    )
    const after = this.memberDto(result.rows[0])
    await this.audit(actor, before ? 'MAPPING_UPDATE' : 'MAPPING_CREATE', `${groupId}:${plate}`, before, after)
    return after
  }
  async deleteMember(actor: AuthUser, groupId: number, plateParam: string) {
    const plate = this.cleanPlate(plateParam)
    const before = await this.findMember(groupId, plate)
    if (!before) throw new NotFoundException('Placa não encontrada no mapeamento')
    await this.db.panel(
      `DELETE FROM panel_fleet_group_members WHERE group_id = $1 AND plate = $2`,
      [groupId, plate]
    )
    await this.audit(actor, 'MAPPING_DELETE', `${groupId}:${plate}`, before, null)
    return { ok: true }
  }
  async auditLogs(query: { group_id?: string; plate?: string; limit?: string }) {
    const limit = Math.max(1, Math.min(Number(query.limit || 100), 500))
    const filters: string[] = [`entity = 'panel_fleet_group_members'`]
    const params: unknown[] = []
    if (query.group_id) {
      params.push(`${query.group_id}:%`)
      filters.push(`entity_id LIKE $${params.length}`)
    }
    if (query.plate) {
      params.push(`%:${this.cleanPlate(query.plate)}`)
      filters.push(`entity_id LIKE $${params.length}`)
    }
    params.push(limit)
    const result = await this.db.panel<{
      id: string
      action: string
      entity_id: string
      actor_user_id: string | null
      actor_email: string | null
      actor_role: string | null
      before_data: Record<string, unknown> | null
      after_data: Record<string, unknown> | null
      created_at: Date
    }>(
      `SELECT id, action, entity_id, actor_user_id, actor_email, actor_role, before_data, after_data, created_at
       FROM panel_audit_logs
       WHERE ${filters.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    )
    return {
      items: result.rows.map(row => {
        const [groupId, plate] = String(row.entity_id || '').split(':')
        const after = row.after_data || {}
        const before = row.before_data || {}
        return {
          id: Number(row.id),
          action: row.action,
          group_id: Number(groupId) || null,
          plate: plate || null,
          base_code: String(after.base_code || before.base_code || after.branch_code || before.branch_code || '') || null,
          actor_user_id: row.actor_user_id ? Number(row.actor_user_id) : null,
          actor_email: row.actor_email,
          actor_role: row.actor_role,
          before_data: row.before_data,
          after_data: row.after_data,
          created_at: row.created_at
        }
      })
    }
  }

  private async buildExcel(
    groupName: string,
    members: MemberDto[]
  ): Promise<Buffer> {
    const bases = await this.baseCodes()
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Transmassa Panel API'
    workbook.created = new Date()

    const fleetSheet = workbook.addWorksheet('Frota', {
      views: [{ state: 'frozen', ySplit: 1 }]
    })
    fleetSheet.columns = [
      { header: EXCEL_HEADERS[0], key: 'plate', width: 14 },
      { header: EXCEL_HEADERS[1], key: 'branch', width: 14 },
      { header: EXCEL_HEADERS[2], key: 'vehicleType', width: 42 },
      { header: EXCEL_HEADERS[3], key: 'ownership', width: 16 },
      { header: EXCEL_HEADERS[4], key: 'ownerCode', width: 22 },
      { header: EXCEL_HEADERS[5], key: 'driver', width: 28 },
      { header: EXCEL_HEADERS[6], key: 'serviceOverride', width: 24 },
      { header: EXCEL_HEADERS[7], key: 'notes', width: 42 }
    ]

    const header = fleetSheet.getRow(1)
    header.font = { bold: true }
    header.alignment = { vertical: 'middle' }
    header.height = 22
    fleetSheet.autoFilter = { from: 'A1', to: 'H1' }
    fleetSheet.getColumn(1).numFmt = '@'

    for (const member of members) {
      fleetSheet.addRow({
        plate: member.plate,
        branch: member.base_code || '',
        vehicleType: member.vehicle_type || '',
        ownership: member.owner_code ? 'TERCEIRO' : 'PROPRIO',
        ownerCode: member.owner_code || '',
        driver: member.driver_name || '',
        serviceOverride: member.service_override || '',
        notes: member.notes || ''
      })
    }

    const referenceSheet = workbook.addWorksheet('Referências')
    referenceSheet.columns = [
      { header: 'FILIAIS', key: 'branches', width: 28 },
      { header: 'TIPOS_CORRIGIDOS', key: 'types', width: 44 },
      { header: 'VINCULOS', key: 'ownerships', width: 18 },
      { header: 'ORIENTACOES', key: 'instructions', width: 78 }
    ]
    referenceSheet.getRow(1).font = { bold: true }

    const branchCodes = bases.items.map(item => item.code)
    const ownerships = ['PROPRIO', 'TERCEIRO']
    const instructions = [
      `Grupo: ${groupName}`,
      'PLACA é obrigatória e deve ter 7 caracteres.',
      'FILIAL deve usar um dos códigos listados nesta aba (ex.: SP).',
      'Se VINCULO = TERCEIRO, preencha TERCEIRO_CODIGO.',
      'Placas que não estiverem no arquivo NÃO serão excluídas do grupo.',
      'Não altere os nomes das colunas da aba Frota.'
    ]
    const referenceRows = Math.max(branchCodes.length, VEHICLE_TYPES.length, ownerships.length, instructions.length)
    for (let index = 0; index < referenceRows; index += 1) {
      referenceSheet.addRow({
        branches: branchCodes[index] || '',
        types: VEHICLE_TYPES[index] || '',
        ownerships: ownerships[index] || '',
        instructions: instructions[index] || ''
      })
    }

    const branchLastRow = Math.max(2, bases.items.length + 1)
    const vehicleTypeLastRow = VEHICLE_TYPES.length + 1
    const ownershipLastRow = ownerships.length + 1
    for (let rowNumber = 2; rowNumber <= 5001; rowNumber += 1) {
      fleetSheet.getCell(rowNumber, 2).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'Referências'!$A$2:$A$${branchLastRow}`]
      }
      fleetSheet.getCell(rowNumber, 3).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'Referências'!$B$2:$B$${vehicleTypeLastRow}`]
      }
      fleetSheet.getCell(rowNumber, 4).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'Referências'!$C$2:$C$${ownershipLastRow}`]
      }
    }

    return workbook.xlsx.writeBuffer()
  }

  private normalizeHeader(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  private cellText(value: ExcelJS.CellValue): string {
    if (value == null) return ''
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value).trim()
    }
    if (value instanceof Date) return value.toISOString()
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((item: { text: string }) => item.text).join('').trim()
    }
    if ('text' in value && typeof value.text === 'string') return value.text.trim()
    if ('result' in value && value.result != null) return this.cellText(value.result)
    return String(value).trim()
  }

  private findColumn(headerMap: Map<string, number>, aliases: string[]): number {
    for (const alias of aliases) {
      const column = headerMap.get(this.normalizeHeader(alias))
      if (column) return column
    }
    return 0
  }

  private async requireGroupName(groupId: number): Promise<string> {
    const result = await this.db.panel<{ name: string }>(
      `SELECT name FROM panel_fleet_groups WHERE id = $1`,
      [groupId]
    )
    if (!result.rows[0]) throw new NotFoundException('Grupo não encontrado')
    return result.rows[0].name
  }

  private async requireGroup(groupId: number) {
    const result = await this.db.panel<{ id: string }>(
      `SELECT id FROM panel_fleet_groups WHERE id = $1`,
      [groupId]
    )
    if (!result.rows[0]) throw new NotFoundException('Grupo não encontrado')
  }
  private async findMember(groupId: number, plate: string) {
    const result = await this.db.panel<MemberRow>(
      `SELECT id, group_id, plate, branch_code, driver_name, vehicle_type, owner_code, service_override, notes, updated_at
       FROM panel_fleet_group_members
       WHERE group_id = $1 AND plate = $2`,
      [groupId, plate]
    )
    return result.rows[0] ? this.memberDto(result.rows[0]) : null
  }
  private memberDto(row: MemberRow): MemberDto {
    return {
      id: Number(row.id),
      group_id: Number(row.group_id),
      plate: row.plate,
      base_code: row.branch_code,
      driver_name: row.driver_name,
      vehicle_type: row.vehicle_type,
      owner_code: row.owner_code,
      service_override: row.service_override,
      notes: row.notes,
      updated_at: row.updated_at
    }
  }
  private audit(actor: AuthUser, action: string, entityId: string, beforeData: unknown, afterData: unknown) {
    return this.db.panel(
      `INSERT INTO panel_audit_logs(action, entity, entity_id, actor_user_id, actor_email, actor_role, before_data, after_data)
       VALUES ($1, 'panel_fleet_group_members', $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
      [action, entityId, actor.sub, actor.email, actor.role, JSON.stringify(beforeData), JSON.stringify(afterData)]
    )
  }
}
