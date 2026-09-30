import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { FleetMappingModule } from '../fleet-mapping/fleet-mapping.module'
import { OperationalController } from './operational.controller'
import { OperationalService } from './operational.service'

@Module({
  imports: [AuthModule, FleetMappingModule],
  controllers: [OperationalController],
  providers: [OperationalService]
})
export class OperationalModule {}
