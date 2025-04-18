import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './lib/prisma/prisma.module';
import { ClsModule } from 'nestjs-cls';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';

@Module({
  imports: [ClsModule.forRoot(), PrismaModule.forRoot(), UserModule, AuthModule, CompanyModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
