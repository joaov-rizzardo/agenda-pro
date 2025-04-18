import { Injectable } from '@nestjs/common';
import { LoginDTO } from '../dtos/login-dto';
import { LoginTemplate } from '../services/login/login-template';
import { CompanyLogin } from '../services/login/company-login';
import { UserRepository } from 'src/modules/user/repositories/user-repository';
import { PasswordHasher } from 'src/modules/user/services/password-hasher/password-hasher';
import { AccessTokenGenerator } from '../services/token/access-token-generator';
import { RefreshTokenGenerator } from '../services/token/refresh-token-generator';
import { MemberRepository } from 'src/modules/company/repositories/member-repository';
import { BasicLogin } from '../services/login/basic-login';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly access: AccessTokenGenerator,
    private readonly refresh: RefreshTokenGenerator,
    private readonly memberRepository: MemberRepository,
  ) {}

  async execute(loginDTO: LoginDTO) {
    let loginTemplate: LoginTemplate;
    if (loginDTO.companyId) {
      loginTemplate = new CompanyLogin(
        this.userRepository,
        this.hasher,
        this.access,
        this.refresh,
        this.memberRepository,
      );
    } else {
      loginTemplate = new BasicLogin(
        this.userRepository,
        this.hasher,
        this.access,
        this.refresh,
      );
    }
    const { accessToken, refreshToken } =
      await await loginTemplate.login(loginDTO);
    return {
      accessToken,
      refreshToken,
    };
  }
}
