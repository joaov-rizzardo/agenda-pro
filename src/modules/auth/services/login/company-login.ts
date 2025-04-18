import { Nullable } from 'src/common/type-utilities';
import { CompanyMember } from 'src/modules/company/entities/company-member';
import { User } from 'src/modules/user/entities/user';
import { LoginTemplate } from './login-template';
import { UserRepository } from 'src/modules/user/repositories/user-repository';
import { PasswordHasher } from 'src/modules/user/services/password-hasher/password-hasher';
import { AccessTokenGenerator } from '../token/access-token-generator';
import { RefreshTokenGenerator } from '../token/refresh-token-generator';
import { MemberRepository } from 'src/modules/company/repositories/member-repository';
import { ServerException } from 'src/common/server-exception';
import { UnauthorizedCompanyAccessException } from '../../exceptions/unauthorized-company-access-exception';

export class CompanyLogin extends LoginTemplate {
  constructor(
    userRepository: UserRepository,
    hasher: PasswordHasher,
    access: AccessTokenGenerator,
    refresh: RefreshTokenGenerator,
    private readonly memberRepository: MemberRepository,
  ) {
    super(userRepository, hasher, access, refresh);
  }
  protected async getCompanyData(
    user: User,
    companyId?: string,
  ): Promise<Nullable<CompanyMember>> {
    if (!companyId) throw new ServerException('Company id was not provided');
    const member = await this.memberRepository.getMember(user.id, companyId);
    if (!member)
      throw new UnauthorizedCompanyAccessException(user.id, companyId);
    return member;
  }
}
