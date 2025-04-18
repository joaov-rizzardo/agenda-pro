import { User } from 'src/modules/user/entities/user';
import { Nullable } from 'src/common/type-utilities';
import { CompanyMember } from 'src/modules/company/entities/company-member';
import { UserRepository } from 'src/modules/user/repositories/user-repository';
import { PasswordHasher } from 'src/modules/user/services/password-hasher/password-hasher';
import { AccessTokenGenerator } from '../token/access-token-generator';
import { RefreshTokenGenerator } from '../token/refresh-token-generator';
import { LoginDTO } from '../../dtos/login-dto';
import { BadCredentialsException } from '../../exceptions/bad-credentials-exception';

interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}

export abstract class LoginTemplate {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly access: AccessTokenGenerator,
    private readonly refresh: RefreshTokenGenerator,
  ) {}
  async login(loginDto: LoginDTO) {
    const user = await this.userRepository.findByEmail(loginDto.email);
    if (!user) throw new BadCredentialsException(loginDto.email);
    const isCorrectPassword = await this.hasher.check(
      loginDto.password,
      user.password,
    );
    if (!isCorrectPassword)
      throw new BadCredentialsException(loginDto.password);
    const companyMember = await this.getCompanyData(user, loginDto.companyId);
    return await this.getTokens(user, companyMember);
  }

  protected abstract getCompanyData(
    user: User,
    companyId?: string,
  ): Promise<Nullable<CompanyMember>>;

  protected async getTokens(
    user: User,
    member: Nullable<CompanyMember>,
  ): Promise<TokensResponse> {
    const [accessToken, refreshToken] = await Promise.all([
      this.access.generate({
        email: user.email,
        userId: user.id,
        role: user.role,
        companyId: member?.companyId,
        companyRole: member?.role,
      }),
      this.refresh.generate(user.id, member?.companyId),
    ]);
    return {
      accessToken,
      refreshToken,
    };
  }
}
