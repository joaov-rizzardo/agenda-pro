import { DynamicModule, Module } from '@nestjs/common';
import { PrismaService } from './prisma-service';
import { TransactionContext } from 'src/common/transaction-context';
import { PrismaTransactionContext } from './prisma-transaction-context';
import { ClsModule } from 'nestjs-cls';

@Module({})
export class PrismaModule {
  static forRoot(): DynamicModule {
    return {
      module: PrismaModule,
      imports: [ClsModule],
      providers: [
        PrismaService,
        {
          provide: TransactionContext,
          useClass: PrismaTransactionContext,
        },
      ],
      exports: [PrismaService, TransactionContext, ClsModule],
      global: true,
    };
  }
}
