import { PrismaClient } from '@prisma/client';
import { PrismaService } from './prisma-service';
import { ClsService } from 'nestjs-cls';
import { PRISMA_TRANSACTION_KEY } from './prisma-transaction-context';

export abstract class BasePrismaRepository {
  constructor(
    protected readonly cls: ClsService,
    protected readonly prismaService: PrismaService,
  ) {}

  get prisma(): PrismaClient {
    const transactionPrisma = this.cls.get<PrismaClient>(
      PRISMA_TRANSACTION_KEY,
    );
    if (transactionPrisma) return transactionPrisma;
    return this.prismaService;
  }
}
