import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator'
import { Role } from '../common/types'

export class CreateUserDto {
  @IsString()
  name!: string

  @IsString()
  username!: string

  @IsString()
  @MinLength(6)
  password!: string

  @IsIn(['ADMIN', 'PANEL'])
  role!: Role
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsIn(['ADMIN', 'PANEL'])
  role?: Role

  @IsOptional()
  @IsBoolean()
  active?: boolean
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  password!: string
}
