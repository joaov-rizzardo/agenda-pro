import { Awaitable } from 'src/common/type-utilities';
import { CompanyRoles } from 'src/modules/company/types/company-roles';
import { AccessTokenPayload } from '../../types/token-payload';

export interface AccessTokenOptions {
  userId: string;
  email: string;
  companyId: string;
  role: CompanyRoles;
}

export abstract class AccessTokenGenerator {
  abstract generate(options: AccessTokenOptions): Awaitable<string>;
  abstract check(token: string): Awaitable<boolean>;
  abstract decode(token: string): Awaitable<AccessTokenPayload>;
}
