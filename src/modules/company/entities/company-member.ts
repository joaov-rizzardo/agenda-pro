// id        String      @id @default(uuid())
// userId    String
// companyId String
// role      CompanyRole
// createdAt DateTime    @default(now())
// updatedAt DateTime    @updatedAt

import { CompanyRoles } from '../types/company-roles';

interface CompanyMemberArgs {
  id: string;
  userId: string;
  companyId: string;
  role: CompanyRoles;
  createdAt: Date;
  updatedAt: Date;
}

export class CompanyMember {
  id: string;
  userId: string;
  companyId: string;
  role: CompanyRoles;
  createdAt: Date;
  updatedAt: Date;

  constructor(args: CompanyMemberArgs) {
    this.id = args.id;
    this.userId = args.userId;
    this.companyId = args.companyId;
    this.role = args.role;
    this.createdAt = args.createdAt;
    this.updatedAt = args.updatedAt;
  }
}
