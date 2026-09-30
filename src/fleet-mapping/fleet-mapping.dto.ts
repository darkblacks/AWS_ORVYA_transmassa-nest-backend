import { IsOptional, IsString } from 'class-validator'

export class UpsertMemberDto {
  @IsOptional()
  @IsString()
  branch_code?: string | null

  @IsOptional()
  @IsString()
  driver_name?: string | null

  @IsOptional()
  @IsString()
  vehicle_type?: string | null

  @IsOptional()
  @IsString()
  owner_code?: string | null

  @IsOptional()
  @IsString()
  service_override?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null
}
