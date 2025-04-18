import { BasePrismaRepository } from 'src/lib/prisma/base-prisma-repository';
import { MemberRepository } from './member-repository';
import { CompanyMember } from '@prisma/client';
import { Nullable } from 'src/common/type-utilities';
import { MemberPrismaMapper } from '../mappers/member-prisma-mapper';

export class PrismaMemberRepository
  extends BasePrismaRepository
  implements MemberRepository
{
  async getMember(
    userId: string,
    companyId: string,
  ): Promise<Nullable<CompanyMember>> {
    const result = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });
    if (!result) return null;
    return MemberPrismaMapper.toDomain(result);
  }
}
