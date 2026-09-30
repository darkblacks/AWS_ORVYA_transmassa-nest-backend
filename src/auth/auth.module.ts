import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'trocar-em-producao',
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '12h' }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule, AuthService]
})
export class AuthModule {}
