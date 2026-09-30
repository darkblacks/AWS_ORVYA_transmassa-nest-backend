import { IsArray, IsBoolean, IsOptional, IsString, Length } from 'class-validator'

export class UpsertBranchDto {
  @IsString()
  @Length(2, 8)
  code!: string

  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  displayName?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[]

  @IsOptional()
  @IsBoolean()
  active?: boolean
}
