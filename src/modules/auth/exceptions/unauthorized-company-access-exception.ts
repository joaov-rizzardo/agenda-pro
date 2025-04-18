import { DomainException } from 'src/common/domain-exception';

export class UnauthorizedCompanyAccessException extends DomainException {
  code = 'UNAUTHORIZED_COMPANY_ACCESS_EXCEPTION';

  constructor(userId: string, companyId: string) {
    super(
      `Unauthorized company access from user ${userId} to company ${companyId}`,
    );
  }
}
