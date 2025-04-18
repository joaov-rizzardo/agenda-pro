import { CompanyRoles } from 'src/modules/company/types/company-roles';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  companyId: string;
  role: CompanyRoles;
  exp: number;
  iat: number;
}

export interface RefreshTokenPayload {
  sub: string;
  companyId: string;
  exp: number;
  iat: number;
}
