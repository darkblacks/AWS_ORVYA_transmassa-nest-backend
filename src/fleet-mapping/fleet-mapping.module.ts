import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { BranchesModule } from '../branches/branches.module'
import { FleetMappingController } from './fleet-mapping.controller'
import { FleetMappingService } from './fleet-mapping.service'

@Module({
  imports: [AuthModule, BranchesModule],
  controllers: [FleetMappingController],
  providers: [FleetMappingService]
})
export class FleetMappingModule {}
