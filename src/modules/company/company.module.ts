import { Module } from '@nestjs/common';
import { CompanyController } from './controllers/company.controller';
import { MemberRepository } from './repositories/member-repository';
import { PrismaMemberRepository } from './repositories/prisma-member-repository';

@Module({
  controllers: [CompanyController],
  providers: [
    {
      provide: MemberRepository,
      useClass: PrismaMemberRepository,
    },
  ],
  exports: [MemberRepository],
})
export class CompanyModule {}
