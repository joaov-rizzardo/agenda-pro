import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './lib/prisma/prisma.module';
import { ClsModule } from 'nestjs-cls';

@Module({
  imports: [ClsModule.forRoot(), PrismaModule.forRoot(), UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
