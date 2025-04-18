import { Module } from '@nestjs/common';
import { CompanyController } from './controllers/company.controller';

@Module({
  controllers: [CompanyController],
  providers: [],
})
export class CompanyModule {}
