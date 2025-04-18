import { Awaitable } from 'src/common/type-utilities';
import { CompanyRoles } from 'src/modules/company/types/company-roles';
import { AccessTokenPayload } from '../../types/token-payload';
import { UserRoles } from 'src/modules/user/types/user-roles';

export interface AccessTokenOptions {
  userId: string;
  email: string;
  companyId?: string;
  companyRole?: CompanyRoles;
  role: UserRoles;
}

export abstract class AccessTokenGenerator {
  abstract generate(options: AccessTokenOptions): Awaitable<string>;
  abstract check(token: string): Awaitable<boolean>;
  abstract decode(token: string): Awaitable<AccessTokenPayload>;
}
