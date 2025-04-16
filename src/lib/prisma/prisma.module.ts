// prisma.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { PrismaService } from './prisma-service';

@Module({})
export class PrismaModule {
  static forRoot(): DynamicModule {
    return {
      module: PrismaModule,
      providers: [PrismaService],
      exports: [PrismaService],
      global: true,
    };
  }
}
