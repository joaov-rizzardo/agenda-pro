import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './lib/prisma/prisma.module';

@Module({
  imports: [PrismaModule.forRoot(), UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
