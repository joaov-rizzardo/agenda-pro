import { CompanyMember } from '@prisma/client';
import { Awaitable, Nullable } from 'src/common/type-utilities';

export abstract class MemberRepository {
  abstract getMember(
    userId: string,
    companyId: string,
  ): Awaitable<Nullable<CompanyMember>>;
}
