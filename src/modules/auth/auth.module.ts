import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { UserModule } from '../user/user.module';
import { CompanyModule } from '../company/company.module';
import { AccessTokenGenerator } from './services/token/access-token-generator';
import { JwtAccessTokenAdapter } from './services/token/jwt-access-token-adapter';
import { RefreshTokenGenerator } from './services/token/refresh-token-generator';
import { JwtRefreshTokenAdapter } from './services/token/jwt-refresh-token-adapter';
import { LoginUseCase } from './use-cases/login-use-case';

@Module({
  imports: [UserModule, CompanyModule],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    {
      provide: AccessTokenGenerator,
      useClass: JwtAccessTokenAdapter,
    },
    {
      provide: RefreshTokenGenerator,
      useClass: JwtRefreshTokenAdapter,
    },
  ],
})
export class AuthModule {}
