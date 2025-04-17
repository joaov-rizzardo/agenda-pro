import { ClsService } from 'nestjs-cls';
import { TransactionContext } from 'src/common/transaction-context';
import { PrismaService } from './prisma-service';
import { Injectable } from '@nestjs/common';

export const PRISMA_TRANSACTION_KEY = 'PRISMA_TRANSACTION_KEY';

@Injectable()
export class PrismaTransactionContext implements TransactionContext {
  constructor(
    private readonly cls: ClsService,
    private readonly prisma: PrismaService,
  ) {}
  async run<T>(callback: () => Promise<T>): Promise<T> {
    return new Promise((resolve) => {
      this.cls.run(() => {
        this.prisma.$transaction(async (tx) => {
          this.cls.set(PRISMA_TRANSACTION_KEY, tx);
          resolve(await callback());
        });
      });
    });
  }
}
