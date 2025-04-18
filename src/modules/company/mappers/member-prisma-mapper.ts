import { CompanyMember as PrismaCompanyMember } from '@prisma/client';
import { CompanyMember } from '../entities/company-member';

export class MemberPrismaMapper {
  static toDomain(member: PrismaCompanyMember): CompanyMember {
    return new CompanyMember({
      id: member.id,
      companyId: member.companyId,
      createdAt: member.createdAt,
      role: member.role,
      updatedAt: member.updatedAt,
      userId: member.userId,
    });
  }
}
