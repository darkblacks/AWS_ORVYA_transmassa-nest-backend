import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { BranchesModule } from './branches/branches.module'
import { DatabaseModule } from './database/database.module'
import { FleetMappingModule } from './fleet-mapping/fleet-mapping.module'
import { OperationalModule } from './operational/operational.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    FleetMappingModule,
    OperationalModule
  ]
})
export class AppModule {}
