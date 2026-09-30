import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)
  const origins = String(config.get('CORS_ORIGINS') || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

  app.enableCors({ origin: origins.length ? origins : true })
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true
  }))

  await app.listen(Number(config.get('PORT') || 8080), '0.0.0.0')
}

bootstrap()
